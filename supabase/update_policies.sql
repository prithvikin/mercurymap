-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own photos" ON photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON photos;

-- Create new policies that allow the demo user ID
CREATE POLICY "Allow demo user to insert photos" ON photos
  FOR INSERT WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Allow demo user to update photos" ON photos
  FOR UPDATE USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Allow demo user to delete photos" ON photos
  FOR DELETE USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Keep the existing select policy
-- CREATE POLICY "Users can view all photos" ON photos
--   FOR SELECT USING (true); 