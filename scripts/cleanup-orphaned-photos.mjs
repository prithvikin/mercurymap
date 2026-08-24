#!/usr/bin/env node

/**
 * Delete image files in the `photos` bucket that no photos row points at.
 *
 * These accumulate because uploadPhoto writes the file before it inserts the
 * row (frontend/src/services/photoService.ts): when the insert fails -- as
 * every public-map upload did before supabase/policies.sql -- the file is
 * already committed to storage and nothing ever references it again.
 *
 * Run from the repository root:
 *   node --env-file=frontend/.env.local scripts/cleanup-orphaned-photos.mjs
 *   node --env-file=frontend/.env.local scripts/cleanup-orphaned-photos.mjs --delete
 *
 * Listing is the default; --delete is the only thing that removes anything.
 *
 * SAFETY -- why the service role key is mandatory even to LIST:
 *
 * Orphan detection asks "which stored files have no row?", so it is only as
 * correct as the set of rows it can see. Under RLS the anon key sees just the
 * public rows (user_id IS NULL) -- every private user's photo would come back
 * unreferenced and be classified as an orphan. Running this with the anon key
 * would therefore propose deleting the entire private library. The service
 * role key bypasses RLS and sees every row, which is the only way this
 * question can be answered safely. The check below is not a convenience.
 */

import { createRequire } from 'node:module';

const frontendRequire = createRequire(new URL('../frontend/package.json', import.meta.url));
const { createClient } = frontendRequire('@supabase/supabase-js');

const BUCKET = 'photos';
const PAGE_SIZE = 100;
const ROW_PAGE_SIZE = 1000;
// An upload that is mid-flight has its file written but its row not yet
// committed, which is indistinguishable from an orphan. Anything younger than
// this is left alone.
const DEFAULT_MIN_AGE_MINUTES = 60;

const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete');
const minAgeArgument = args.find((argument) => argument.startsWith('--min-age-minutes='));
const minAgeMinutes = minAgeArgument
  ? Number(minAgeArgument.split('=')[1])
  : DEFAULT_MIN_AGE_MINUTES;
const unknownArguments = args.filter(
  (argument) => argument !== '--delete' && !argument.startsWith('--min-age-minutes=')
);

if (unknownArguments.length > 0) {
  console.error(`Unknown argument(s): ${unknownArguments.join(', ')}`);
  console.error(
    'Usage: node --env-file=frontend/.env.local scripts/cleanup-orphaned-photos.mjs [--delete] [--min-age-minutes=N]'
  );
  process.exitCode = 2;
} else if (!Number.isFinite(minAgeMinutes) || minAgeMinutes < 0) {
  console.error(`--min-age-minutes must be a non-negative number, got: ${minAgeMinutes}`);
  process.exitCode = 2;
} else {
  await main();
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.REACT_APP_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('Missing SUPABASE_URL (or REACT_APP_SUPABASE_URL).');
    process.exitCode = 2;
    return;
  }

  // See the SAFETY note above: the anon key cannot see private rows, so it
  // would misreport every private photo as an orphan. Refuse outright.
  if (!serviceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY.');
    console.error(
      'This script refuses to run on the anon key: RLS would hide every private\n' +
        "photo's row and their files would be misreported as orphans. Get the key from\n" +
        'Supabase -> Project Settings -> API -> service_role, and keep it out of the\n' +
        'browser bundle (it bypasses RLS entirely).'
    );
    process.exitCode = 2;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  console.log(`Reading rows and storage from ${supabaseUrl}`);

  const referenced = await fetchReferencedPaths(supabase);
  console.log(`  ${referenced.size} file_path value(s) referenced by photos rows`);

  const objects = await listBucketObjects(supabase);
  console.log(`  ${objects.length} file(s) in the "${BUCKET}" bucket`);

  // A row set that came back empty alongside a non-empty bucket means the read
  // failed or pointed at the wrong project -- deleting on that basis would
  // remove everything. Bail instead.
  if (referenced.size === 0 && objects.length > 0) {
    console.error(
      '\nRefusing to continue: found files but zero referenced paths. That usually\n' +
        'means the photos table read failed or this is the wrong project.'
    );
    process.exitCode = 1;
    return;
  }

  const cutoff = Date.now() - minAgeMinutes * 60_000;
  const orphans = [];
  let skippedRecent = 0;

  for (const object of objects) {
    if (referenced.has(object.path)) continue;

    const createdAt = object.created_at ? Date.parse(object.created_at) : Number.NaN;
    if (Number.isFinite(createdAt) && createdAt > cutoff) {
      skippedRecent += 1;
      continue;
    }
    orphans.push(object);
  }

  if (skippedRecent > 0) {
    console.log(
      `  ${skippedRecent} unreferenced file(s) younger than ${minAgeMinutes}m left alone (possible in-flight upload)`
    );
  }

  if (orphans.length === 0) {
    console.log('\nNo orphaned files. Nothing to do.');
    return;
  }

  console.log(`\n${orphans.length} orphaned file(s):`);
  for (const orphan of orphans) {
    const size = typeof orphan.size === 'number' ? `${(orphan.size / 1024).toFixed(0)}KB` : '?';
    console.log(`  ${orphan.path}  (${size}, created ${orphan.created_at ?? 'unknown'})`);
  }

  if (!shouldDelete) {
    console.log(
      `\nDry run -- nothing deleted. Re-run with --delete to remove these ${orphans.length} file(s).`
    );
    return;
  }

  console.log(`\nDeleting ${orphans.length} file(s)…`);
  const paths = orphans.map((orphan) => orphan.path);
  for (let index = 0; index < paths.length; index += PAGE_SIZE) {
    const batch = paths.slice(index, index + PAGE_SIZE);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error(`Failed to delete batch starting at ${batch[0]}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`  removed ${Math.min(index + batch.length, paths.length)}/${paths.length}`);
  }
  console.log('Done.');
}

/** Every file_path referenced by a row, read past RLS with the service role. */
async function fetchReferencedPaths(supabase) {
  const paths = new Set();
  for (let from = 0; ; from += ROW_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('photos')
      .select('file_path')
      .range(from, from + ROW_PAGE_SIZE - 1);

    if (error) throw new Error(`Reading photos rows failed: ${error.message}`);
    for (const row of data) {
      if (row.file_path) paths.add(row.file_path);
    }
    if (data.length < ROW_PAGE_SIZE) return paths;
  }
}

/**
 * Every object in the bucket, as { path, size, created_at }.
 *
 * uploadPhoto stores files under a `photos/` prefix INSIDE the `photos` bucket,
 * so keys look like `photos/1740512345678.jpg` and that full key is what the
 * file_path column holds. list() is per-prefix and does not recurse, so this
 * walks the folders and rebuilds full keys to compare against file_path.
 */
async function listBucketObjects(supabase) {
  const objects = [];
  const prefixes = [''];

  while (prefixes.length > 0) {
    const prefix = prefixes.pop();
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, { limit: PAGE_SIZE, offset });

      if (error) throw new Error(`Listing "${prefix || '/'}" failed: ${error.message}`);

      for (const entry of data) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        // Folders come back as entries with no id/metadata; recurse into them.
        if (entry.id === null || entry.id === undefined) {
          prefixes.push(path);
        } else {
          objects.push({
            path,
            size: entry.metadata?.size,
            created_at: entry.created_at,
          });
        }
      }

      if (data.length < PAGE_SIZE) break;
    }
  }

  return objects;
}
