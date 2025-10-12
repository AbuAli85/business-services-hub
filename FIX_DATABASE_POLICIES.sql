-- Fix RLS Policies for Notifications and Audit Logs
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Enable RLS on notifications table (if not already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Create policy for admins to insert notifications for any user
CREATE POLICY "Admins can insert notifications for any user" ON notifications
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- 3. Create policy for users to read their own notifications
CREATE POLICY "Users can read their own notifications" ON notifications
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 4. Create policy for users to update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 5. Enable RLS on service_audit_logs table (if not already enabled)
ALTER TABLE service_audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Create policy for admins to insert audit logs
CREATE POLICY "Admins can insert audit logs" ON service_audit_logs
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- 7. Create policy for admins to read audit logs
CREATE POLICY "Admins can read audit logs" ON service_audit_logs
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'manager')
  )
);

-- 8. Create policy for service providers to read audit logs for their own services
CREATE POLICY "Providers can read audit logs for their services" ON service_audit_logs
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM services 
    WHERE services.id = service_audit_logs.service_id 
    AND services.provider_id = auth.uid()
  )
);

-- 9. Verify the policies were created
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
WHERE tablename IN ('notifications', 'service_audit_logs')
ORDER BY tablename, policyname;

-- 10. Test the policies (optional - run as admin user)
-- INSERT INTO notifications (user_id, type, title, message, data, priority, action_url, action_label, read, created_at, updated_at)
-- VALUES (
--   'some-user-id',
--   'service',
--   'Test Notification',
--   'This is a test',
--   '{}',
--   'normal',
--   '/test',
--   'Test',
--   false,
--   NOW(),
--   NOW()
-- );

-- INSERT INTO service_audit_logs (service_id, event, actor_id, actor_name, actor_email, metadata, created_at)
-- VALUES (
--   'some-service-id',
--   'Test Event',
--   auth.uid(),
--   'Test Admin',
--   'admin@test.com',
--   '{}',
--   NOW()
-- );
