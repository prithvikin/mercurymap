-- Migration script to set existing photos as public
-- This ensures all existing photos are visible to everyone (public map)

UPDATE photos 
SET user_id = NULL 
WHERE user_id IS NOT NULL;

-- Verify the migration
SELECT 
  COUNT(*) as total_photos,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as public_photos,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as private_photos
FROM photos; 