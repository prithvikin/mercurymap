-- Migration for an already-deployed MercuryMap database.
-- Run this once in the Supabase dashboard -> SQL Editor.
--
-- Adds the global cache table used by /api/community-recommendations, the
-- public (no-login-required) counterpart to the per-user /api/recommendations
-- feature. There is exactly one row (id = 'global'), regenerated at most once
-- every 24h by that endpoint using the Supabase service role key.

CREATE TABLE IF NOT EXISTS community_recommendations (
  id                  TEXT PRIMARY KEY DEFAULT 'global',
  intro               TEXT NOT NULL,
  suggestions         JSONB NOT NULL,
  source_photo_count  INT NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE community_recommendations ENABLE ROW LEVEL SECURITY;

-- Deliberately no policies: this table is only ever read/written by the
-- serverless function using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- The anon and authenticated roles get no access at all, so the cached
-- public-facing copy can't be read or tampered with directly via the anon key.

-- ---------------------------------------------------------------------------
-- Verify: after running, from the browser console (anon key, signed out),
--   supabase.from('community_recommendations').select('*')
-- should return an empty array / permission error, never the row itself.
-- The row should only ever be visible through GET /api/community-recommendations.
-- ---------------------------------------------------------------------------
