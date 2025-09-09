-- Safe Email Notification System Setup
-- This handles existing tables and policies gracefully

-- 1. Create email notification logs table (if not exists)
CREATE TABLE IF NOT EXISTS email_notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  provider TEXT DEFAULT 'supabase',
  provider_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user email preferences table (if not exists)
CREATE TABLE IF NOT EXISTS user_email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  template_style TEXT DEFAULT 'modern' CHECK (template_style IN ('modern', 'minimal', 'corporate')),
  delivery_frequency TEXT DEFAULT 'immediate' CHECK (delivery_frequency IN ('immediate', 'daily_digest', 'weekly_digest', 'never')),
  disabled_types TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Create indexes for better performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_notification_id ON email_notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_email ON email_notification_logs(email);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_status ON email_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_sent_at ON email_notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id ON user_email_preferences(user_id);

-- 4. Enable RLS (if not already enabled)
ALTER TABLE email_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own email logs" ON email_notification_logs;
DROP POLICY IF EXISTS "Service role can manage email logs" ON email_notification_logs;
DROP POLICY IF EXISTS "Users can manage their own email preferences" ON user_email_preferences;
DROP POLICY IF EXISTS "Service role can manage email preferences" ON user_email_preferences;

-- 6. Create RLS Policies for email_notification_logs
CREATE POLICY "Users can view their own email logs" ON email_notification_logs
  FOR SELECT USING (
    notification_id IN (
      SELECT id FROM notifications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage email logs" ON email_notification_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 7. Create RLS Policies for user_email_preferences
CREATE POLICY "Users can manage their own email preferences" ON user_email_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role can manage email preferences" ON user_email_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- 8. Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create triggers for updated_at (if not exists)
DROP TRIGGER IF EXISTS update_email_notification_logs_updated_at ON email_notification_logs;
CREATE TRIGGER update_email_notification_logs_updated_at
  BEFORE UPDATE ON email_notification_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_email_preferences_updated_at ON user_email_preferences;
CREATE TRIGGER update_user_email_preferences_updated_at
  BEFORE UPDATE ON user_email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Create function to get email notification stats (if not exists)
CREATE OR REPLACE FUNCTION get_email_notification_stats(user_id_param UUID)
RETURNS TABLE (
  total_emails BIGINT,
  sent_emails BIGINT,
  failed_emails BIGINT,
  pending_emails BIGINT,
  last_email_sent TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_emails,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_emails,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_emails,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_emails,
    MAX(sent_at) as last_email_sent
  FROM email_notification_logs enl
  JOIN notifications n ON enl.notification_id = n.id
  WHERE n.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- 11. Create view for email notification analytics (if not exists)
DROP VIEW IF EXISTS email_notification_analytics;
CREATE VIEW email_notification_analytics AS
SELECT 
  enl.notification_type,
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE enl.status = 'sent') as sent_count,
  COUNT(*) FILTER (WHERE enl.status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE enl.status = 'pending') as pending_count,
  ROUND(
    (COUNT(*) FILTER (WHERE enl.status = 'sent')::DECIMAL / COUNT(*)) * 100, 
    2
  ) as success_rate,
  AVG(EXTRACT(EPOCH FROM (enl.sent_at - enl.created_at))) as avg_delivery_time_seconds
FROM email_notification_logs enl
GROUP BY enl.notification_type
ORDER BY total_emails DESC;

-- 12. Insert default email preferences for your user (if not exists)
INSERT INTO user_email_preferences (user_id, email_enabled, template_style, delivery_frequency, disabled_types)
VALUES (
  'afd6ae15-28e8-494f-9d79-cbc2f0b04ae0',
  true,
  'modern',
  'immediate',
  '{}'
) ON CONFLICT (user_id) DO UPDATE SET
  email_enabled = true,
  template_style = 'modern',
  delivery_frequency = 'immediate',
  updated_at = NOW();

-- 13. Test the setup
SELECT 'Email notification system setup complete!' as status;
