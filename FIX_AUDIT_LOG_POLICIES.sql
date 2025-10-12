-- =====================================================
-- FIX AUDIT LOG RLS POLICIES
-- =====================================================
-- This script removes conflicting policies and creates
-- clean, working policies for service_audit_logs table
-- =====================================================

-- Step 1: Remove all existing policies to start fresh
-- =====================================================
DROP POLICY IF EXISTS "Admins can insert audit logs" ON service_audit_logs;
DROP POLICY IF EXISTS "Admins can read audit logs" ON service_audit_logs;
DROP POLICY IF EXISTS "Providers can read audit logs for their services" ON service_audit_logs;
DROP POLICY IF EXISTS "allow_read_audit_logs" ON service_audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin_staff" ON service_audit_logs;
DROP POLICY IF EXISTS "Admin insert audit logs" ON service_audit_logs;
DROP POLICY IF EXISTS "Admin read audit logs" ON service_audit_logs;

-- Step 2: Create clean, simple policies
-- =====================================================

-- Allow admins and managers to insert audit logs
CREATE POLICY "admin_insert_audit_logs" ON service_audit_logs
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Allow admins and managers to read all audit logs
-- AND allow providers to read audit logs for their own services
CREATE POLICY "admin_provider_read_audit_logs" ON service_audit_logs
FOR SELECT 
TO authenticated
USING (
  -- Admins and managers can see all
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
  OR
  -- Providers can see logs for their services
  EXISTS (
    SELECT 1 FROM services 
    WHERE services.id = service_audit_logs.service_id 
    AND services.provider_id = auth.uid()
  )
);

-- Step 3: Verify the policies were created
-- =====================================================
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'service_audit_logs'
ORDER BY policyname;

-- Step 4: Verify your admin role
-- =====================================================
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  created_at 
FROM profiles 
WHERE id = auth.uid();

-- Step 5: Test insert (this should work now)
-- =====================================================
-- This is just for testing - the app will handle actual inserts
-- Uncomment to test:
/*
INSERT INTO service_audit_logs (
  service_id,
  event,
  actor_id,
  actor_name,
  actor_email,
  metadata,
  created_at
) VALUES (
  '3fc4f5f2-35e9-4b86-beb1-f43d3e97483a', -- Use a real service ID from your database
  'Test Approval',
  auth.uid(),
  'Fahad alamri',
  'luxsess2001@gmail.com',
  '{"test": true, "action": "approve"}',
  NOW()
);
*/

-- Step 6: View recent audit logs
-- =====================================================
SELECT 
  service_id,
  event,
  actor_name,
  actor_email,
  metadata,
  created_at
FROM service_audit_logs
ORDER BY created_at DESC
LIMIT 10;

