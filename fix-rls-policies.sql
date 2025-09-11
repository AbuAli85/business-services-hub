-- Fix RLS policies for user_security and user_notifications tables

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read own security settings" ON public.user_security;
DROP POLICY IF EXISTS "Allow upsert own security settings" ON public.user_security;
DROP POLICY IF EXISTS "Allow update own security settings" ON public.user_security;

-- Create new policies for user_security
CREATE POLICY "Allow read own security settings" ON public.user_security
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow upsert own security settings" ON public.user_security
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow update own security settings" ON public.user_security
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Drop existing policies if they exist for user_notifications
DROP POLICY IF EXISTS "Allow read own notification settings" ON public.user_notifications;
DROP POLICY IF EXISTS "Allow upsert own notification settings" ON public.user_notifications;
DROP POLICY IF EXISTS "Allow update own notification settings" ON public.user_notifications;

-- Add missing columns if they don't exist for user_notifications
ALTER TABLE public.user_notifications 
ADD COLUMN IF NOT EXISTS booking_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_reports BOOLEAN DEFAULT true;

-- Create new policies for user_notifications
CREATE POLICY "Allow read own notification settings" ON public.user_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow upsert own notification settings" ON public.user_notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow update own notification settings" ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_security TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_notifications TO authenticated;

-- Ensure notifications table has proper indexes and realtime enabled
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Enable realtime for notifications table (if not already added)
DO $$
BEGIN
  -- Check if notifications table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;