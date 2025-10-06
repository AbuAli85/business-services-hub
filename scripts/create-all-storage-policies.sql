-- ============================================================================
-- CREATE ALL STORAGE BUCKET POLICIES
-- ============================================================================
-- This script creates RLS policies for all storage buckets
-- 
-- IMPORTANT: If you get "must be owner of table objects" error:
-- 1. This script requires service_role permissions
-- 2. Use Supabase Dashboard UI instead: Storage → Policies → New Policy
-- ============================================================================

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BOOKING-FILES BUCKET POLICIES
-- ============================================================================

-- Drop existing policies (cleanup)
DROP POLICY IF EXISTS "booking_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "booking_files_select" ON storage.objects;
DROP POLICY IF EXISTS "booking_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "booking_files_update" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to booking-files
CREATE POLICY "booking_files_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'booking-files');

-- Policy 2: Allow public to read from booking-files
CREATE POLICY "booking_files_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'booking-files');

-- Policy 3: Allow authenticated users to delete from booking-files
CREATE POLICY "booking_files_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'booking-files');

-- Policy 4: Allow authenticated users to update booking-files
CREATE POLICY "booking_files_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'booking-files');

-- ============================================================================
-- TASK-FILES BUCKET POLICIES
-- ============================================================================

-- Drop existing policies (cleanup)
DROP POLICY IF EXISTS "task_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_files_select" ON storage.objects;
DROP POLICY IF EXISTS "task_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "task_files_update" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to task-files
CREATE POLICY "task_files_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-files');

-- Policy 2: Allow public to read from task-files
CREATE POLICY "task_files_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'task-files');

-- Policy 3: Allow authenticated users to delete from task-files
CREATE POLICY "task_files_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-files');

-- Policy 4: Allow authenticated users to update task-files
CREATE POLICY "task_files_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'task-files');

-- ============================================================================
-- MILESTONE-FILES BUCKET POLICIES
-- ============================================================================

-- Drop existing policies (cleanup)
DROP POLICY IF EXISTS "milestone_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "milestone_files_select" ON storage.objects;
DROP POLICY IF EXISTS "milestone_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "milestone_files_update" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to milestone-files
CREATE POLICY "milestone_files_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'milestone-files');

-- Policy 2: Allow public to read from milestone-files
CREATE POLICY "milestone_files_select"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'milestone-files');

-- Policy 3: Allow authenticated users to delete from milestone-files
CREATE POLICY "milestone_files_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'milestone-files');

-- Policy 4: Allow authenticated users to update milestone-files
CREATE POLICY "milestone_files_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'milestone-files');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check all policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND (
    policyname LIKE '%booking_files%' OR
    policyname LIKE '%task_files%' OR
    policyname LIKE '%milestone_files%'
  )
ORDER BY policyname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
    AND (
      policyname LIKE '%booking_files%' OR
      policyname LIKE '%task_files%' OR
      policyname LIKE '%milestone_files%'
    );
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ STORAGE POLICIES CREATED SUCCESSFULLY!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '📁 BOOKING-FILES bucket:';
  RAISE NOTICE '   ✓ booking_files_insert (INSERT - authenticated)';
  RAISE NOTICE '   ✓ booking_files_select (SELECT - public)';
  RAISE NOTICE '   ✓ booking_files_delete (DELETE - authenticated)';
  RAISE NOTICE '   ✓ booking_files_update (UPDATE - authenticated)';
  RAISE NOTICE '';
  RAISE NOTICE '📁 TASK-FILES bucket:';
  RAISE NOTICE '   ✓ task_files_insert (INSERT - authenticated)';
  RAISE NOTICE '   ✓ task_files_select (SELECT - public)';
  RAISE NOTICE '   ✓ task_files_delete (DELETE - authenticated)';
  RAISE NOTICE '   ✓ task_files_update (UPDATE - authenticated)';
  RAISE NOTICE '';
  RAISE NOTICE '📁 MILESTONE-FILES bucket:';
  RAISE NOTICE '   ✓ milestone_files_insert (INSERT - authenticated)';
  RAISE NOTICE '   ✓ milestone_files_select (SELECT - public)';
  RAISE NOTICE '   ✓ milestone_files_delete (DELETE - authenticated)';
  RAISE NOTICE '   ✓ milestone_files_update (UPDATE - authenticated)';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '🚀 ALL DONE! You can now upload files in your application!';
  RAISE NOTICE '============================================================================';
END $$;

