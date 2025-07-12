-- Migration script to add authentication features to existing photos table
-- Run this if you already have a photos table from schema_no_auth.sql

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'photos' AND column_name = 'user_id') THEN
        ALTER TABLE photos ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable Row Level Security if not already enabled
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all photos" ON photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON photos;

-- Create new policies
CREATE POLICY "Users can view all photos" ON photos
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own photos" ON photos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos" ON photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_country ON photos(country);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);

-- Set all existing photos as public (user_id = NULL)
UPDATE photos SET user_id = NULL WHERE user_id IS NULL;

-- Verify the migration
SELECT 
  COUNT(*) as total_photos,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as public_photos,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as private_photos
FROM photos; 