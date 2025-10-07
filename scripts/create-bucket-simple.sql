-- SIMPLE STORAGE BUCKET CREATION (No permission issues)
-- Run this in Supabase SQL Editor

-- Create the booking-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booking-files',
  'booking-files',
  true,  -- Public bucket
  52428800,  -- 50MB limit
  NULL  -- Allow all file types
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Verify bucket was created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets
WHERE id = 'booking-files';

