-- =====================================================
-- DEBUG RLS POLICY IN APP CONTEXT
-- =====================================================

-- Step 1: Check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'service_audit_logs'
ORDER BY policyname;

-- Step 2: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'service_audit_logs';

-- Step 3: Verify your profile and role
SELECT 
  id,
  email,
  full_name,
  role,
  created_at
FROM profiles
WHERE id = '3f5dea42-c4bd-44bd-bcb9-0ac81e3c8170';

-- Step 4: Create a more permissive temporary policy for testing
-- This will help us isolate the issue

-- First, drop existing insert policies
DROP POLICY IF EXISTS "admin_insert_audit_logs" ON service_audit_logs;
DROP POLICY IF EXISTS "Admin insert audit logs" ON service_audit_logs;
DROP POLICY IF EXISTS "Allow admin insert audit logs" ON service_audit_logs;

-- Create a simple, direct policy
CREATE POLICY "allow_authenticated_admin_insert" ON service_audit_logs
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Direct check: is the current user an admin?
  (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

-- Verify the new policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'service_audit_logs'
AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 5: Test if you can now insert
-- (This should work if the policy is correct)
DO $$
DECLARE
  test_user_id UUID := '3f5dea42-c4bd-44bd-bcb9-0ac81e3c8170';
BEGIN
  -- Set the session to your user (simulating app context)
  PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
  
  -- Try to insert
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
    'Policy Test Insert',
    test_user_id,
    'Fahad alamri',
    'luxsess2001@gmail.com',
    '{"test": true, "source": "policy_test"}',
    NOW()
  );
  
  RAISE NOTICE 'Policy test insert successful!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Policy test insert failed: %', SQLERRM;
END $$;

-- Step 6: Check if the test insert worked
SELECT 
  event,
  actor_name,
  metadata,
  created_at
FROM service_audit_logs
WHERE metadata->>'source' = 'policy_test'
ORDER BY created_at DESC
LIMIT 1;

