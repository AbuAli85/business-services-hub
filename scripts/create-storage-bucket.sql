-- CREATE SUPABASE STORAGE BUCKET FOR FILE UPLOADS
-- Run this script in Supabase SQL Editor

-- Step 1: Create the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booking-files',
  'booking-files',
  true,  -- Public bucket (files are accessible via public URL)
  52428800,  -- 50MB limit
  NULL  -- Allow all file types (alternatively specify: ARRAY['image/jpeg', 'image/png', 'application/pdf'])
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist (cleanup)
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their files" ON storage.objects;

-- Step 4: Create policies for the booking-files bucket

-- Policy 1: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'booking-files'
);

-- Policy 2: Allow everyone to read files (public bucket)
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'booking-files'
);

-- Policy 3: Allow authenticated users to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'booking-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update their files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'booking-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verification: Check if bucket was created
SELECT 
  id,
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets
WHERE id = 'booking-files';

-- Verification: Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%booking%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Storage bucket "booking-files" created successfully!';
  RAISE NOTICE '✅ RLS policies configured!';
  RAISE NOTICE '📁 Bucket is PUBLIC - files accessible via public URLs';
  RAISE NOTICE '🔒 Upload/Delete restricted to authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 You can now upload files from your application!';
END $$;

