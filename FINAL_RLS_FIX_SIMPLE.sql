-- =====================================================
-- FINAL RLS FIX - Ultra Simple Policy
-- =====================================================
-- This creates the simplest possible policy that should
-- work in both SQL and app contexts
-- =====================================================

-- Step 1: Remove ALL existing insert policies
DROP POLICY IF EXISTS "admin_insert_audit_logs" ON service_audit_logs;
DROP POLICY IF EXISTS "Admin insert audit logs" ON service_audit_logs;
DROP POLICY IF EXISTS "Allow admin insert audit logs" ON service_audit_logs;
DROP POLICY IF EXISTS "allow_authenticated_admin_insert" ON service_audit_logs;
DROP POLICY IF EXISTS "super_simple_insert" ON service_audit_logs;

-- Step 2: Create an ultra-simple policy for authenticated users
-- This policy allows ANY authenticated user to insert
-- (We can restrict later once we confirm it works)
CREATE POLICY "allow_all_authenticated_insert" ON service_audit_logs
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Step 3: Verify the policy was created
SELECT 
  policyname,
  cmd,
  with_check::text
FROM pg_policies 
WHERE tablename = 'service_audit_logs'
AND cmd = 'INSERT';

-- Step 4: Test insert with the new policy
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
  'Ultra Simple Policy Test',
  '3f5dea42-c4bd-44bd-bcb9-0ac81e3c8170',
  'Fahad alamri',
  'luxsess2001@gmail.com',
  '{"test": true, "source": "ultra_simple_policy"}',
  NOW()
);

-- Step 5: Verify the test insert
SELECT 
  event,
  actor_name,
  metadata,
  created_at
FROM service_audit_logs
WHERE metadata->>'source' = 'ultra_simple_policy'
ORDER BY created_at DESC
LIMIT 1;

-- Step 6: Show all current policies
SELECT 
  policyname,
  cmd,
  with_check::text
FROM pg_policies 
WHERE tablename = 'service_audit_logs'
ORDER BY cmd, policyname;

