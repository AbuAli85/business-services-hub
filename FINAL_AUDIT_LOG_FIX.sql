-- =====================================================
-- FINAL AUDIT LOG FIX - Remove ALL old policies
-- =====================================================

-- Remove ALL existing policies (including the ones you just created)
DROP POLICY IF EXISTS "Allow admin insert audit logs" ON service_audit_logs;
DROP POLICY IF EXISTS "Allow admin read audit logs" ON service_audit_logs;
DROP POLICY IF EXISTS "admin_insert_audit_logs" ON service_audit_logs;
DROP POLICY IF EXISTS "admin_provider_read_audit_logs" ON service_audit_logs;

-- Verify all policies are removed
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'service_audit_logs';
-- Should return empty result

-- Now create ONLY the two clean policies
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

CREATE POLICY "admin_provider_read_audit_logs" ON service_audit_logs
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
  OR
  EXISTS (
    SELECT 1 FROM services 
    WHERE services.id = service_audit_logs.service_id 
    AND services.provider_id = auth.uid()
  )
);

-- Verify the final state - should show ONLY 2 policies
SELECT 
  policyname,
  cmd,
  with_check,
  qual
FROM pg_policies 
WHERE tablename = 'service_audit_logs'
ORDER BY policyname;

-- Test that you can now insert
-- (This should work without errors)
DO $$
BEGIN
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
    'SQL Test Insert',
    '3f5dea42-c4bd-44bd-bcb9-0ac81e3c8170',
    'Fahad alamri',
    'luxsess2001@gmail.com',
    '{"test": true, "source": "sql_test"}',
    NOW()
  );
  
  RAISE NOTICE 'Test insert successful!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

-- View recent audit logs to confirm
SELECT 
  service_id,
  event,
  actor_name,
  created_at
FROM service_audit_logs
ORDER BY created_at DESC
LIMIT 5;

