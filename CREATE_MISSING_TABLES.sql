-- Create missing tables if they don't exist
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Create notifications table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  action_url TEXT,
  action_label TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create service_audit_logs table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS service_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  actor_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE INDEX IF NOT EXISTS idx_service_audit_logs_service_id ON service_audit_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_service_audit_logs_created_at ON service_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_audit_logs_event ON service_audit_logs(event);

-- 4. Add updated_at trigger for notifications table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Verify tables exist
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name IN ('notifications', 'service_audit_logs')
AND table_schema = 'public';
