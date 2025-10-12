-- =====================================================
-- CHECK RLS STATUS FOR AUDIT LOGS
-- =====================================================

-- Check if RLS is enabled on the table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '❌ RLS IS ENABLED - This will block service role key!'
    ELSE '✅ RLS IS DISABLED - Service role key should work'
  END as status
FROM pg_tables 
WHERE tablename = 'service_audit_logs';

-- Check current policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles::text
FROM pg_policies 
WHERE tablename = 'service_audit_logs'
ORDER BY cmd, policyname;

-- If RLS is enabled, disable it NOW
DO $$
DECLARE
  rls_status boolean;
BEGIN
  SELECT rowsecurity INTO rls_status
  FROM pg_tables 
  WHERE tablename = 'service_audit_logs';
  
  IF rls_status THEN
    RAISE NOTICE '⚠️ RLS is currently ENABLED - Disabling now...';
    ALTER TABLE service_audit_logs DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS has been DISABLED for service_audit_logs';
  ELSE
    RAISE NOTICE '✅ RLS is already DISABLED - No action needed';
  END IF;
END $$;

-- Verify RLS is now disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '❌ STILL ENABLED - Manual intervention needed!'
    ELSE '✅ DISABLED - Ready for service role key'
  END as final_status
FROM pg_tables 
WHERE tablename = 'service_audit_logs';

