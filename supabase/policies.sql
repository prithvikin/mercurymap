-- Public-map write policies for MercuryMap.
-- Run this once in the Supabase dashboard -> SQL Editor.
--
-- Fixes: "new row violates row-level security policy for table photos" when
-- uploading to the PUBLIC map.
--
-- Why it was broken. A public-map photo is stored as a row with no owner
-- (user_id IS NULL -- see photoService.uploadPhoto, which sends
-- `user_id: userId || null`). The only INSERT policy on the table is
-- schema.sql's `WITH CHECK (auth.uid() = user_id)`, so a public upload
-- evaluates `auth.uid() = NULL`. In SQL's three-valued logic that is NULL,
-- not TRUE, and RLS admits a row only on TRUE -- so every public upload was
-- rejected. Note that the SELECT side already had an explicit
-- `user_id IS NULL` branch (schema.sql:27-28); only the write side was
-- missing one.
--
-- Policy history: this originally granted INSERT to one pinned owner account
-- only. As of 2026-08-24, MercuryMap intentionally opens public-map INSERT to
-- any signed-in user (see the SECURITY section below for why "signed-in" is
-- the line and not "anyone, including signed out"). UPDATE and DELETE stay
-- owner-only: a public row has no uploader identity to check against, so
-- owner-only is the only way to keep a moderation lever at all.
--
-- Idempotent: safe to re-run. Resolves the owner's UUID at install time, so
-- there is no literal to paste and nothing to keep in sync by hand.

-- ---------------------------------------------------------------------------
-- SECURITY -- read before editing
-- ---------------------------------------------------------------------------
-- Do NOT simplify the INSERT policy to `WITH CHECK (user_id IS NULL)`.
--
-- Both the `anon` and `authenticated` roles are reachable with the anon key,
-- and Create React App inlines that key into the public browser bundle (see
-- frontend/src/lib/supabase.ts). A bare `user_id IS NULL` check -- with no
-- `auth.uid() IS NOT NULL` conjunct -- would let a fully signed-out visitor,
-- or a bot with nothing but the public anon key, write arbitrary rows onto
-- the public map with a two-line fetch: no account, no rate limit, no
-- moderation before it appears. That line matters even though sign-up itself
-- is nearly frictionless (no email confirmation required by default), because
-- it is the difference between "a human clicked through a form" and "a script
-- can do this at unlimited volume with no human involved at all."
--
-- The `auth.uid() IS NOT NULL` conjunct is the whole security boundary on
-- INSERT now. It must not be dropped.
--
-- UPDATE and DELETE stay scoped to the single pinned owner, not to "whoever
-- created the row" -- a publicly-inserted row carries no uploader identity to
-- check against (user_id is NULL by definition), so owner-only is the only
-- option that leaves anyone able to remove a bad photo after the fact.
-- The owner is pinned by immutable auth.users UUID rather than by the email
-- claim: `auth.jwt() ->> 'email'` is a mutable attribute baked into a token
-- that stays valid until refresh, and its trustworthiness depends on
-- email-confirmation being enabled in the project's auth settings.
-- ---------------------------------------------------------------------------

-- Any signed-in user may insert a public (unowned) photo. This sits alongside
-- the per-user policy from schema.sql rather than replacing it: policies are
-- permissive and OR-ed, so a signed-in user's private uploads keep working
-- through "Users can insert their own photos".
DROP POLICY IF EXISTS "Owner can insert public photos" ON photos;
DROP POLICY IF EXISTS "Authenticated users can insert public photos" ON photos;
CREATE POLICY "Authenticated users can insert public photos" ON photos
  FOR INSERT WITH CHECK (user_id IS NULL AND auth.uid() IS NOT NULL);

DO $$
DECLARE
  owner_email TEXT := 'mercurymap725@gmail.com';
  owner_id UUID;
BEGIN
  SELECT id INTO owner_id FROM auth.users WHERE email = owner_email;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION
      'No auth.users row for %. Register that account first, or set owner_email above.',
      owner_email;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Owner can update public photos" ON photos';
  EXECUTE format(
    'CREATE POLICY "Owner can update public photos" ON photos
       FOR UPDATE USING (user_id IS NULL AND auth.uid() = %L::uuid)',
    owner_id
  );

  EXECUTE 'DROP POLICY IF EXISTS "Owner can delete public photos" ON photos';
  EXECUTE format(
    'CREATE POLICY "Owner can delete public photos" ON photos
       FOR DELETE USING (user_id IS NULL AND auth.uid() = %L::uuid)',
    owner_id
  );

  RAISE NOTICE 'Public-map write policies installed for % (%)', owner_email, owner_id;
END $$;

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
-- Expect "Authenticated users can insert public photos" plus the two
-- "Owner can ... public photos" policies below, alongside the per-user ones
-- from schema.sql. Also check the SELECT rows while you are here: if any has
-- a `qual` of just `true`, the stale policy from add_auth_to_existing.sql
-- survived and every user's private photos are readable with the anon key --
-- run add_recommendations.sql to fix that.
--
--   SELECT policyname, cmd, qual, with_check
--     FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'photos'
--    ORDER BY cmd, policyname;
