-- Migration for an already-deployed MercuryMap database.
-- Run this once in the Supabase dashboard -> SQL Editor. Every statement is
-- guarded (IF NOT EXISTS / CREATE OR REPLACE), so re-running it is a no-op.
--
-- Adds the storage and query surface behind the semantic photo search feature:
--   * /api/search  -- natural-language search over public photos
--   * /api/similar -- "more photos like this one"
--
-- WHY THIS SHAPE (the search architecture is a deliberate split):
--
-- Embeddings are 384-dimensional vectors from Xenova/all-MiniLM-L6-v2. That
-- model is ~90MB of weights. Loading it inside a Vercel serverless function on
-- every cold start would dominate both latency and bundle size, so we never
-- embed at query time. Instead:
--
--   * Photo vectors are generated OFFLINE by scripts/backfill-embeddings.mjs
--     and written into photos.embedding. They only change when a photo's text
--     changes, so batch generation is the natural fit.
--   * "Find similar photos" compares two stored vectors, so it needs no
--     query-time model at all -- that's what pgvector + the HNSW index below
--     are for.
--   * Natural-language SEARCH can't use those vectors (we'd have to embed the
--     user's sentence to compare against them). So instead Claude parses the
--     sentence into keywords + structured filters, and Postgres full-text
--     search does the retrieval. That's what the tsv column and its GIN index
--     are for. It costs one cheap Haiku call per search instead of a 90MB
--     cold start, and it gives us filters (country, date range) that a pure
--     vector search couldn't express.
--
-- TRADEOFF worth knowing about: photos.embedding is a wide column (384 floats,
-- ~6KB as JSON) and photos.tsv is a stored tsvector. photoService.ts currently
-- fetches photos with select('*'), so after this migration every photo list
-- carries both. If map loads feel heavier, narrow those selects to the columns
-- the UI actually uses -- the search endpoints below never rely on select('*').

-- ---------------------------------------------------------------------------
-- 1. Extension
-- ---------------------------------------------------------------------------
-- Supabase ships pgvector; this just enables it for this database. It lands in
-- the "extensions" schema on Supabase, which is already on the search_path.
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- 2. Columns
-- ---------------------------------------------------------------------------
-- 384 dims is not arbitrary -- it is all-MiniLM-L6-v2's output size. Changing
-- the model means changing this number AND re-running the backfill, because
-- vectors of different dimensionality are not comparable.
ALTER TABLE photos ADD COLUMN IF NOT EXISTS embedding vector(384);

-- tsv is GENERATED rather than trigger-maintained on purpose: Postgres keeps
-- it in sync with title/country/description automatically, so there is no way
-- for an app-side insert path to forget to update it. That matters because
-- PhotoUpload writes rows directly through PostgREST, not through a service
-- layer we control.
--
-- Weights encode what a traveler is most likely searching for: the place name
-- (title) beats the country, which beats free-text description. ts_rank reads
-- these weights, so an exact title hit outranks an incidental description hit.
--
-- The expression must be IMMUTABLE for a generated column, which is why the
-- regconfig is spelled out as 'english' rather than relying on the session
-- default (to_tsvector(text) alone is only STABLE and would be rejected).
ALTER TABLE photos ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(country, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
-- HNSW over cosine distance. Cosine (not L2) because the backfill script
-- normalizes every vector, which makes cosine the meaningful metric -- and the
-- operator class has to match the operator used in the query (<=>), otherwise
-- Postgres silently falls back to a sequential scan.
--
-- HNSW over IVFFlat because HNSW needs no training pass and stays accurate on a
-- small, growing table. IVFFlat wants a representative sample before its lists
-- are any good, which a photo app in its early days does not have.
--
-- If your pgvector predates 0.5.0 this statement will fail; in that case swap
-- it for:
--   CREATE INDEX IF NOT EXISTS idx_photos_embedding
--     ON photos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_photos_embedding
  ON photos USING hnsw (embedding vector_cosine_ops);

-- GIN is the right index for @@ lookups against a stored tsvector column.
CREATE INDEX IF NOT EXISTS idx_photos_tsv ON photos USING gin (tsv);

-- ---------------------------------------------------------------------------
-- 4. Query functions
-- ---------------------------------------------------------------------------
-- Both endpoints go through RPCs rather than PostgREST query building, for two
-- reasons:
--   * PostgREST cannot express "ORDER BY embedding <=> $1" or ts_rank ordering.
--   * Hard-coding `user_id IS NULL` here means the public endpoints physically
--     cannot leak a private photo, even though they connect with the service
--     role key (which bypasses RLS). The check lives in one place instead of
--     being re-derived in every caller.
-- Parameter names deliberately avoid colliding with photos column names, since
-- an ambiguous reference inside the function body would be a runtime error.

-- Natural-language search. Claude turns the user's sentence into a keyword list
-- plus optional filters; this function is the retrieval half.
CREATE OR REPLACE FUNCTION search_public_photos(
  query_keywords text[] DEFAULT '{}',
  filter_country text DEFAULT NULL,
  date_from date DEFAULT NULL,
  date_to date DEFAULT NULL,
  match_count int DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  country text,
  latitude numeric,
  longitude numeric,
  taken_date date,
  file_path text,
  file_url text,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  tsq tsquery;
BEGIN
  -- websearch_to_tsquery is used instead of to_tsquery because it never throws
  -- on odd input -- it is designed to swallow whatever a search box produces.
  -- Joining the keywords with " or " makes the match a union: a photo matching
  -- any expanded keyword is a candidate, and ts_rank sorts out how good it is.
  tsq := websearch_to_tsquery(
    'english',
    nullif(btrim(array_to_string(coalesce(query_keywords, '{}'), ' or ')), '')
  );

  RETURN QUERY
  SELECT
    p.id, p.title, p.description, p.country, p.latitude, p.longitude,
    p.taken_date, p.file_path, p.file_url, p.user_id, p.created_at, p.updated_at,
    CASE WHEN tsq IS NULL THEN 0::real ELSE ts_rank(p.tsv, tsq) END
  FROM photos p
  WHERE p.user_id IS NULL
    -- A keyword-free query is legitimate: "photos from Japan in 2023" is all
    -- filters and no text. In that case skip the FTS predicate entirely
    -- rather than matching nothing.
    AND (tsq IS NULL OR p.tsv @@ tsq)
    AND (filter_country IS NULL OR p.country ILIKE filter_country)
    -- taken_date is nullable (the upload form doesn't require it), so fall back
    -- to created_at the same way the UI's photoDate() helper does. Without the
    -- coalesce, a date filter would silently drop every undated photo.
    AND (date_from IS NULL OR coalesce(p.taken_date, p.created_at::date) >= date_from)
    AND (date_to IS NULL OR coalesce(p.taken_date, p.created_at::date) <= date_to)
  ORDER BY
    CASE WHEN tsq IS NULL THEN 0::real ELSE ts_rank(p.tsv, tsq) END DESC,
    p.created_at DESC
  LIMIT greatest(1, least(coalesce(match_count, 24), 100));
END;
$$;

-- Photo-to-photo similarity. No query-time embedding needed: both vectors are
-- already in the table, which is the whole reason pgvector earns its place here.
CREATE OR REPLACE FUNCTION similar_public_photos(
  source_id uuid,
  match_count int DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  country text,
  latitude numeric,
  longitude numeric,
  taken_date date,
  file_path text,
  file_url text,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  similarity real
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  src vector(384);
BEGIN
  -- Read the source vector into a local first. If this were a scalar subquery
  -- inside the ORDER BY it would still work, but pulling it out keeps the
  -- distance expression a plain parameter, which is what lets the planner use
  -- the HNSW index instead of sorting the whole table.
  -- The user_id IS NULL guard means a private photo's id can't be used as a
  -- similarity probe from the public endpoint.
  SELECT p.embedding INTO src
  FROM photos p
  WHERE p.id = source_id AND p.user_id IS NULL;

  -- No embedding yet (backfill hasn't reached this row) -> return nothing and
  -- let the caller fall back. Silence here is a normal state, not an error.
  IF src IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.title, p.description, p.country, p.latitude, p.longitude,
    p.taken_date, p.file_path, p.file_url, p.user_id, p.created_at, p.updated_at,
    -- <=> is cosine DISTANCE (0 = identical). Flip it so the API returns a
    -- similarity score, which is what a UI wants to show.
    (1 - (p.embedding <=> src))::real
  FROM photos p
  WHERE p.user_id IS NULL
    AND p.id <> source_id
    AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> src
  LIMIT greatest(1, least(coalesce(match_count, 12), 50));
END;
$$;

-- Both functions only ever return rows that are already world-readable under
-- the "Public photos are readable" RLS policy, so leaving EXECUTE at its
-- default (PUBLIC) grants nothing that the anon key couldn't already select.
-- They are called with the service role key today; this just means a future
-- client-side caller wouldn't need a schema change.

-- PostgREST caches the schema. Supabase usually reloads on its own, but nudging
-- it means /api/search stops reporting "degraded" the moment this script ends
-- rather than a minute later.
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Verify: run these after the script. Expected results are noted inline.
--
-- 1. Columns exist:
--      SELECT column_name, data_type FROM information_schema.columns
--       WHERE table_name = 'photos' AND column_name IN ('embedding', 'tsv');
--    -> two rows ('embedding' USER-DEFINED, 'tsv' tsvector).
--
-- 2. tsv populated itself for existing rows (generated columns backfill on
--    ADD COLUMN, so this should already be non-zero):
--      SELECT count(*) FROM photos WHERE tsv IS NOT NULL;
--
-- 3. Full-text search works before any embedding exists -- this is what makes
--    /api/search useful the moment the migration lands:
--      SELECT title, country, rank FROM search_public_photos(ARRAY['beach','coast']);
--
-- 4. Similarity returns zero rows until the backfill runs. That is correct:
--      SELECT count(*) FROM photos WHERE embedding IS NOT NULL;   -- 0 for now
--    Then run, from the repo root:
--      node --env-file=.env.local scripts/backfill-embeddings.mjs
--    and re-check -- it should equal the number of photos with a title.
--
-- 5. After the backfill, similarity works end to end:
--      SELECT title, similarity
--        FROM similar_public_photos((SELECT id FROM photos WHERE user_id IS NULL LIMIT 1));
--
-- 6. The HNSW index is actually being used (look for "Index Scan using
--    idx_photos_embedding", not "Seq Scan"):
--      EXPLAIN ANALYZE SELECT id FROM photos
--       WHERE embedding IS NOT NULL
--       ORDER BY embedding <=> (SELECT embedding FROM photos WHERE embedding IS NOT NULL LIMIT 1)
--       LIMIT 5;
-- ---------------------------------------------------------------------------
