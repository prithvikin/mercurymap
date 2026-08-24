#!/usr/bin/env node

/**
 * Backfill the offline photo embeddings used by MercuryMap's pgvector search.
 *
 * This intentionally runs outside the serverless request path. The
 * Xenova/all-MiniLM-L6-v2 weights are roughly 90MB, so paying that cold-start
 * cost while a visitor searches would make an otherwise cheap endpoint slow.
 * Batch generation is a better tradeoff: the model is loaded once, vectors
 * are normalized once, and the database can be resumed row-by-row after an
 * interruption.
 *
 * Run from the repository root:
 *   node --env-file=frontend/.env.local scripts/backfill-embeddings.mjs
 *   node --env-file=frontend/.env.local scripts/backfill-embeddings.mjs --dry-run
 *
 * The frontend package owns the dependencies in this repository. The
 * createRequire/import dance below resolves them from frontend/node_modules
 * without adding a second root package.json or duplicating dependencies.
 */

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const frontendRequire = createRequire(new URL('../frontend/package.json', import.meta.url));
const { createClient } = frontendRequire('@supabase/supabase-js');
const transformersEntry = frontendRequire.resolve('@xenova/transformers');
const { env, pipeline } = await import(pathToFileURL(transformersEntry).href);

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSIONS = 384;
const BATCH_SIZE = 16;
const DEFAULT_DESCRIPTION = '';
const dryRun = process.argv.slice(2).includes('--dry-run');
const unknownArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== '--dry-run');

if (unknownArguments.length > 0) {
  console.error(`Unknown argument(s): ${unknownArguments.join(', ')}`);
  console.error('Usage: node --env-file=frontend/.env.local scripts/backfill-embeddings.mjs [--dry-run]');
  process.exitCode = 2;
} else {
  await main();
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.REACT_APP_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // A dry run only reads public rows, so the browser-safe anon key is enough to
  // probe whether the migration exists when someone follows the documented
  // frontend/.env.local command. Real embedding writes still require the
  // service role key below; we never weaken that requirement for a non-dry run.
  const readKey =
    serviceRoleKey ??
    (dryRun
      ? process.env.SUPABASE_ANON_KEY ?? process.env.REACT_APP_SUPABASE_ANON_KEY
      : undefined);

  if (dryRun && !serviceRoleKey && readKey) {
    console.warn(
      'Dry run is using the browser-safe anon key because SUPABASE_SERVICE_ROLE_KEY is not set; ' +
        'it can inspect public photos but cannot perform a backfill.'
    );
  }

  // Do not silently substitute the browser's anon key for an actual backfill.
  // Embeddings are written to every public and private photo, while RLS
  // intentionally only permits a user to update their own rows; the service
  // role is the only safe way to perform one complete, resumable backfill.
  if (!supabaseUrl || !readKey) {
    const missing = [
      !supabaseUrl ? 'SUPABASE_URL' : null,
      !readKey
        ? dryRun
          ? 'SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)'
          : 'SUPABASE_SERVICE_ROLE_KEY'
        : null,
    ].filter(Boolean);
    console.error(
      `Cannot backfill embeddings: missing ${missing.join(' and ')}. ` +
        'Use --env-file=frontend/.env.local for the documented dry-run, or provide ' +
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for a real backfill.'
    );
    process.exitCode = 1;
    return;
  }

  if (!serviceRoleKey && !dryRun) {
    console.error(
      'Cannot backfill embeddings: SUPABASE_SERVICE_ROLE_KEY is required for writes. ' +
        'No rows were changed.'
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, readKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Probe the new column before loading the model. This makes the common
  // pre-migration case fast and actionable, and prevents a 90MB model download
  // for a job that cannot possibly write anything yet.
  const { data: photos, error: fetchError } = await supabase
    .from('photos')
    .select('id, title, country, description, taken_date, created_at')
    .is('embedding', null)
    .order('created_at', { ascending: true });

  if (fetchError) {
    if (isMissingEmbeddingColumn(fetchError)) {
      console.error(
        'The photos.embedding column is missing. Run supabase/add_semantic_search.sql ' +
          'in the Supabase SQL editor, then run this backfill again.'
      );
      // A missing migration is an expected setup state, not a failed partial
      // backfill. Exit successfully so a morning smoke test can report it
      // clearly without looking like a corrupted embedding job.
      return;
    }

    console.error('Could not read photos for embedding backfill:', fetchError.message);
    process.exitCode = 1;
    return;
  }

  const pendingPhotos = photos ?? [];
  if (pendingPhotos.length === 0) {
    console.log('Embedding backfill is already complete: no photos are missing an embedding.');
    return;
  }

  console.log(
    `${dryRun ? 'Dry run:' : 'Starting'} ${pendingPhotos.length} photo${pendingPhotos.length === 1 ? '' : 's'} ` +
      `without embeddings (batch size ${BATCH_SIZE}).`
  );

  if (dryRun) {
    console.log('Dry run complete: no model was loaded and no database rows were changed.');
    return;
  }

  // Transformers.js stores its model cache under the user's cache directory by
  // default. Keeping remote models enabled makes the first run download the
  // verified model, while later resumptions reuse the local copy.
  env.allowRemoteModels = true;
  console.log(`Loading ${MODEL_ID} once for offline batch generation...`);
  const extractor = await pipeline('feature-extraction', MODEL_ID);

  let completed = 0;
  for (let start = 0; start < pendingPhotos.length; start += BATCH_SIZE) {
    const batch = pendingPhotos.slice(start, start + BATCH_SIZE);
    const vectors = await Promise.all(
      batch.map(async (photo) => ({
        id: photo.id,
        embedding: await embedPhoto(extractor, photo),
      }))
    );

    // Each row is updated independently rather than upserting the whole batch.
    // If a process dies halfway through, rows already written are no longer
    // returned by `.is('embedding', null)` on the next run.
    for (const { id, embedding } of vectors) {
      const { error: updateError } = await supabase
        .from('photos')
        .update({ embedding })
        .eq('id', id)
        .is('embedding', null);

      if (updateError) {
        console.error(`Failed to write embedding for photo ${id}:`, updateError.message);
        process.exitCode = 1;
        return;
      }

      completed += 1;
      console.log(`Embedded ${completed}/${pendingPhotos.length} (${id})`);
    }
  }

  console.log(`Embedding backfill complete: wrote ${completed} vector${completed === 1 ? '' : 's'}.`);
}

/**
 * Build only from fields already in the database. Keeping labels in the text
 * gives the sentence encoder stable context ("country: Peru" is clearer than
 * a bare "Peru"), while omitting empty fields avoids teaching it the word
 * "undefined" or creating misleading repeated tokens.
 */
function photoText(photo) {
  const fields = [
    ['title', photo.title],
    ['country', photo.country],
    ['description', photo.description],
    ['date', photo.taken_date ?? photo.created_at],
  ];

  return fields
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join('. ');
}

async function embedPhoto(extractor, photo) {
  const output = await extractor(photoText(photo), {
    pooling: 'mean',
    normalize: true,
  });
  const embedding = Array.from(output.data, Number);

  // The model contract is 384 dimensions. Check it before writing so a future
  // model/config change cannot poison a table that the HNSW index expects to be
  // vector(384). The `normalize: true` option above provides unit length; the
  // explicit check below catches malformed output but does not re-normalize it.
  if (
    embedding.length !== EMBEDDING_DIMENSIONS ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(
      `Expected ${EMBEDDING_DIMENSIONS} finite dimensions for ${MODEL_ID}, got ${embedding.length}`
    );
  }

  return embedding;
}

function isMissingEmbeddingColumn(error) {
  // PostgREST usually returns PostgreSQL's undefined_column (42703). Keep the
  // message check too because hosted proxies can omit the code while retaining
  // the useful column name.
  return (
    error?.code === '42703' ||
    /column .*embedding.* does not exist/i.test(error?.message ?? '') ||
    /embedding.*column/i.test(error?.message ?? '')
  );
}
