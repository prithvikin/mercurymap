import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const MAX_RESULTS = 12;

interface SimilarPhoto {
  id: string;
  title: string;
  description: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  taken_date: string | null;
  file_path: string;
  file_url: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  similarity: number;
}

const PHOTO_COLUMNS =
  'id, title, description, country, latitude, longitude, taken_date, file_path, file_url, user_id, created_at, updated_at';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const photoId = getQueryParam(req.query.photoId);
  if (!photoId) {
    return res.status(400).json({ error: 'Add a photo id with ?photoId=' });
  }
  if (!isUuid(photoId)) {
    return res.status(400).json({ error: 'photoId must be a valid UUID' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = (
      ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const
    ).filter((name) => !process.env[name]);
    console.error('Missing required environment variables:', missing.join(', '));
    return res.status(500).json({ error: 'Server is not configured', missing });
  }

  // This public route uses the service role for one consistent RPC call, so the
  // RPC itself and this source lookup both explicitly restrict to user_id IS
  // NULL. A private photo id must not become a similarity oracle.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: source, error: sourceError } = await supabase
      .from('photos')
      .select('id')
      .eq('id', photoId)
      .is('user_id', null)
      .maybeSingle();

    if (sourceError) throw sourceError;
    if (!source) {
      return res.status(404).json({ error: 'Public photo not found' });
    }

    const { data: similar, error: similarError } = await supabase.rpc(
      'similar_public_photos',
      { source_id: photoId, match_count: MAX_RESULTS }
    );

    if (similarError) {
      if (!isSemanticMigrationMissing(similarError)) {
        console.error('Similar-photo lookup failed:', similarError.message);
        return res.status(500).json({ error: 'Could not find similar photos' });
      }

      // The app can be deployed before the owner runs the SQL editor migration.
      // Return a successful, empty result so the UI can remain usable and explain
      // the setup state instead of treating an expected migration gap as a 500.
      console.warn(
        'Similarity migration is not available; returning a degraded result:',
        similarError.message
      );
      return res.status(200).json({
        photos: [],
        sourcePhotoId: photoId,
        degraded: true,
        note: 'Similar photos are unavailable until the semantic search migration and embedding backfill are complete.',
      });
    }

    const photos = (similar ?? []) as SimilarPhoto[];
    if (photos.length > 0) {
      return res.status(200).json({
        photos,
        sourcePhotoId: photoId,
        degraded: false,
      });
    }

    // A successful RPC with zero rows can mean this particular photo has not
    // been backfilled yet. Distinguish that from a genuinely isolated photo so
    // the client can show the right explanation. The vector is selected only
    // after the migration exists; its pgvector string representation is opaque
    // and we only need to know whether it is null.
    const { data: sourceWithEmbedding, error: embeddingError } = await supabase
      .from('photos')
      .select('embedding')
      .eq('id', photoId)
      .is('user_id', null)
      .maybeSingle();

    if (embeddingError && isSemanticMigrationMissing(embeddingError)) {
      return res.status(200).json({
        photos: [],
        sourcePhotoId: photoId,
        degraded: true,
        note: 'Similar photos are unavailable until the semantic search migration and embedding backfill are complete.',
      });
    }
    if (embeddingError) throw embeddingError;

    // If the source has a vector but it is the only public vector, the query is
    // technically valid but the backfill is still incomplete. Report that as a
    // degraded setup state rather than making the UI call it a genuine no-match.
    const { count: embeddedCount, error: countError } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .is('user_id', null)
      .not('embedding', 'is', null);
    if (countError && isSemanticMigrationMissing(countError)) {
      return res.status(200).json({
        photos: [],
        sourcePhotoId: photoId,
        degraded: true,
        note: 'Similar photos are unavailable until the semantic search migration and embedding backfill are complete.',
      });
    }
    if (countError) throw countError;

    const backfillIncomplete =
      sourceWithEmbedding?.embedding == null || (embeddedCount ?? 0) <= 1;
    return res.status(200).json({
      photos: [],
      sourcePhotoId: photoId,
      degraded: backfillIncomplete,
      ...(backfillIncomplete
        ? {
            note: 'This photo has not been embedded yet, or there are not enough embedded photos yet. Run the embedding backfill to enable similar-photo results.',
          }
        : {}),
    });
  } catch (error) {
    console.error('Similar-photo endpoint failed:', error);
    return res.status(500).json({ error: 'Could not find similar photos' });
  }
}

function getQueryParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? '';
}

function isUuid(value: string): boolean {
  // Supabase photo ids are UUIDs. Validate the shape before passing it to an
  // RPC so malformed input gets a useful 400 instead of a Postgres error. Do
  // not require a particular UUID version: imported/test data can legitimately
  // use a nil or non-v4 UUID even though new rows use gen_random_uuid().
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isSemanticMigrationMissing(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? '';
  return (
    error.code === '42703' ||
    error.code === 'PGRST202' ||
    /similar_public_photos|embedding|tsv|function .* does not exist/i.test(message)
  );
}
