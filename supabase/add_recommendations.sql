-- Migration for an already-deployed MercuryMap database.
-- Run this once in the Supabase dashboard -> SQL Editor.
--
-- Two changes:
--   1. Fixes the photos SELECT policy, which currently exposes every row.
--   2. Adds the recommendations cache table used by /api/recommendations.

-- ---------------------------------------------------------------------------
-- 1. Fix the photos read policy
-- ---------------------------------------------------------------------------
-- The existing policy is FOR SELECT USING (true), which lets anyone holding the
-- anon key read every photo row -- and the anon key is inlined into the browser
-- bundle by Create React App. "Private" maps were enforced only by a
-- client-side .eq('user_id', ...) filter, which is not a security boundary.
--
-- These two policies preserve the current behaviour (public map reads
-- unowned rows, private maps read your own) while making it real.

DROP POLICY IF EXISTS "Users can view all photos" ON photos;

CREATE POLICY "Public photos are readable" ON photos
  FOR SELECT USING (user_id IS NULL);

CREATE POLICY "Own photos are readable" ON photos
  FOR SELECT USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Recommendations cache
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendations (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  intro        TEXT NOT NULL,
  suggestions  JSONB NOT NULL,
  photo_count  INT NOT NULL,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own recommendations are readable" ON recommendations;
CREATE POLICY "Own recommendations are readable" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own recommendations" ON recommendations;
CREATE POLICY "Users can insert their own recommendations" ON recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own recommendations" ON recommendations;
CREATE POLICY "Users can update their own recommendations" ON recommendations
  FOR UPDATE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Verify: after running, the public map and a signed-in private map should both
-- still work. From the browser console while signed out,
--   supabase.from('photos').select('*')
-- should return only rows with user_id IS NULL.
-- ---------------------------------------------------------------------------
