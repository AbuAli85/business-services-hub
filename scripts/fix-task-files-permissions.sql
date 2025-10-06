-- ============================================================================
-- FIX TASK_FILES TABLE PERMISSIONS
-- ============================================================================
-- This script fixes the "permission denied for table task_files" error
-- by granting proper permissions to authenticated users
-- ============================================================================

-- Step 1: Grant basic table permissions
-- ============================================================================

-- Grant SELECT permission to authenticated users
GRANT SELECT ON task_files TO authenticated;

-- Grant INSERT permission to authenticated users
GRANT INSERT ON task_files TO authenticated;

-- Grant UPDATE permission to authenticated users
GRANT UPDATE ON task_files TO authenticated;

-- Grant DELETE permission to authenticated users
GRANT DELETE ON task_files TO authenticated;

-- Grant USAGE on the sequence (for ID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Step 2: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE task_files ENABLE ROW LEVEL SECURITY;

-- Step 3: Recreate RLS policies (in case they're broken)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view task files" ON task_files;
DROP POLICY IF EXISTS "Users can upload task files" ON task_files;
DROP POLICY IF EXISTS "Users can delete their task files" ON task_files;
DROP POLICY IF EXISTS "Users can update their task files" ON task_files;

-- Policy 1: Allow all authenticated users to view task files
CREATE POLICY "Users can view task files"
ON task_files FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow all authenticated users to upload task files
CREATE POLICY "Users can upload task files"
ON task_files FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Allow users to update their own files
CREATE POLICY "Users can update their task files"
ON task_files FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Policy 4: Allow users to delete their own files
CREATE POLICY "Users can delete their task files"
ON task_files FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

-- Step 4: Verification
-- ============================================================================

-- Check table exists
SELECT 
  'task_files' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_files')
    THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status;

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'task_files';

-- Check policies
SELECT 
  policyname as policy_name,
  cmd as command,
  permissive,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE '⚠️ No USING clause'
  END as using_status,
  CASE 
    WHEN with_check IS NOT NULL THEN '✅ Has WITH CHECK clause'
    ELSE '⚠️ No WITH CHECK clause'
  END as check_status
FROM pg_policies
WHERE tablename = 'task_files'
ORDER BY policyname;

-- Check grants
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'task_files'
  AND grantee = 'authenticated'
ORDER BY privilege_type;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  grant_count INTEGER;
  policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Check grants
  SELECT COUNT(*) INTO grant_count
  FROM information_schema.table_privileges
  WHERE table_name = 'task_files'
    AND grantee = 'authenticated';
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'task_files';
  
  -- Check RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'task_files';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '✅ TASK_FILES PERMISSIONS FIXED!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Status:';
  RAISE NOTICE '   • Table grants: % permissions granted', grant_count;
  RAISE NOTICE '   • RLS policies: % policies created', policy_count;
  RAISE NOTICE '   • RLS enabled: %', CASE WHEN rls_enabled THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Permissions granted:';
  RAISE NOTICE '   • SELECT (view files)';
  RAISE NOTICE '   • INSERT (upload files)';
  RAISE NOTICE '   • UPDATE (edit own files)';
  RAISE NOTICE '   • DELETE (delete own files)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security policies:';
  RAISE NOTICE '   • All users can view task files';
  RAISE NOTICE '   • All users can upload task files';
  RAISE NOTICE '   • Users can only update their own files';
  RAISE NOTICE '   • Users can only delete their own files';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '🚀 The "permission denied" error should now be fixed!';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
END $$;

