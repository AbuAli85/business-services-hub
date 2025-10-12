-- =====================================================
-- FIX TABLE PERMISSIONS FOR SERVICE_AUDIT_LOGS
-- =====================================================
-- This grants ALL permissions to ensure service role can write
-- =====================================================

-- Step 1: Check current table permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'service_audit_logs'
ORDER BY grantee, privilege_type;

-- Step 2: Grant ALL privileges to the authenticator role (service role uses this)
GRANT ALL ON TABLE service_audit_logs TO authenticator;
GRANT ALL ON TABLE service_audit_logs TO postgres;
GRANT ALL ON TABLE service_audit_logs TO anon;
GRANT ALL ON TABLE service_audit_logs TO authenticated;
GRANT ALL ON TABLE service_audit_logs TO service_role;

-- Step 3: Ensure RLS is definitely disabled
ALTER TABLE service_audit_logs DISABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies to remove any interference
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'service_audit_logs'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON service_audit_logs';
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Step 5: Verify permissions were granted
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'service_audit_logs'
AND grantee IN ('authenticator', 'postgres', 'anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;

-- Step 6: Verify RLS is disabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'service_audit_logs';

-- Step 7: Test direct insert as service_role
-- This should work if permissions are correct
INSERT INTO service_audit_logs (
  service_id,
  event,
  actor_id,
  actor_name,
  actor_email,
  metadata,
  created_at
) VALUES (
  '3fc4f5f2-35e9-4b86-beb1-f43d3e97483a',
  'Permission Fix Test',
  '3f5dea42-c4bd-44bd-bcb9-0ac81e3c8170',
  'Fahad alamri',
  'luxsess2001@gmail.com',
  '{"test": true, "source": "permission_fix"}',
  NOW()
);

-- Step 8: Verify the test insert
SELECT 
  event,
  actor_name,
  metadata,
  created_at
FROM service_audit_logs
WHERE metadata->>'source' = 'permission_fix';

