<<<<<<< HEAD
-- Create email notification logs table
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

-- Create user email preferences table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_notification_id ON email_notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_email ON email_notification_logs(email);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_status ON email_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_sent_at ON email_notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id ON user_email_preferences(user_id);

-- Enable RLS
ALTER TABLE email_notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_notification_logs
=======
-- Create email notification system tables
-- Run this in your Supabase SQL Editor

-- Email notification logs table
CREATE TABLE IF NOT EXISTS email_notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending', 'bounced', 'delivered', 'opened', 'clicked')),
  error_message TEXT,
  provider VARCHAR(50) DEFAULT 'supabase',
  provider_message_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  notification_type VARCHAR(50) NOT NULL,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_expires_at TIMESTAMP WITH TIME ZONE,
  email_template_style VARCHAR(20) DEFAULT 'modern' CHECK (email_template_style IN ('modern', 'minimal', 'corporate')),
  send_time_preference VARCHAR(20) DEFAULT 'immediate' CHECK (send_time_preference IN ('immediate', 'daily', 'weekly', 'never')),
  daily_digest_time TIME DEFAULT '09:00',
  weekly_digest_day INTEGER DEFAULT 1 CHECK (weekly_digest_day BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  unsubscribe_token VARCHAR(255) UNIQUE,
  is_unsubscribed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, email_address)
);

-- Email queue table for batch processing
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest, 10 = lowest
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_notification_id ON email_notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_email ON email_notification_logs(email);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_sent_at ON email_notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_notification_logs_status ON email_notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_email_templates_notification_type ON email_templates(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences(email_address);
CREATE INDEX IF NOT EXISTS idx_email_preferences_unsubscribe_token ON email_preferences(unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled_at ON email_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority);
CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id);

-- RLS policies for email_notification_logs
ALTER TABLE email_notification_logs ENABLE ROW LEVEL SECURITY;

>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
CREATE POLICY "Users can view their own email logs" ON email_notification_logs
  FOR SELECT USING (
    notification_id IN (
      SELECT id FROM notifications WHERE user_id = auth.uid()
    )
  );

<<<<<<< HEAD
CREATE POLICY "Service role can manage email logs" ON email_notification_logs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_email_preferences
CREATE POLICY "Users can manage their own email preferences" ON user_email_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role can manage email preferences" ON user_email_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
=======
CREATE POLICY "Service role can manage all email logs" ON email_notification_logs
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active templates" ON email_templates
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

CREATE POLICY "Service role can manage all templates" ON email_templates
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for email_preferences
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own email preferences" ON email_preferences
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all email preferences" ON email_preferences
  FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for email_queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queued emails" ON email_queue
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all queued emails" ON email_queue
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for email notification management
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

<<<<<<< HEAD
-- Create triggers for updated_at
=======
-- Triggers for updated_at
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
CREATE TRIGGER update_email_notification_logs_updated_at
  BEFORE UPDATE ON email_notification_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

<<<<<<< HEAD
CREATE TRIGGER update_user_email_preferences_updated_at
  BEFORE UPDATE ON user_email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to cleanup old email logs
CREATE OR REPLACE FUNCTION cleanup_old_email_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM email_notification_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to get email notification stats
CREATE OR REPLACE FUNCTION get_email_notification_stats(user_id_param UUID)
RETURNS TABLE (
  total_emails BIGINT,
  sent_emails BIGINT,
  failed_emails BIGINT,
  pending_emails BIGINT,
  last_email_sent TIMESTAMPTZ
=======
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user email preferences
CREATE OR REPLACE FUNCTION get_user_email_preferences(user_uuid UUID)
RETURNS TABLE (
  email_address VARCHAR,
  is_verified BOOLEAN,
  email_template_style VARCHAR,
  send_time_preference VARCHAR,
  daily_digest_time TIME,
  weekly_digest_day INTEGER,
  is_unsubscribed BOOLEAN
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
<<<<<<< HEAD
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

-- Create view for email notification analytics
CREATE OR REPLACE VIEW email_notification_analytics AS
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
=======
    ep.email_address,
    ep.is_verified,
    ep.email_template_style,
    ep.send_time_preference,
    ep.daily_digest_time,
    ep.weekly_digest_day,
    ep.is_unsubscribed
  FROM email_preferences ep
  WHERE ep.user_id = user_uuid
  ORDER BY ep.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to queue email notification
CREATE OR REPLACE FUNCTION queue_email_notification(
  p_notification_id UUID,
  p_user_id UUID,
  p_email_address VARCHAR,
  p_notification_type VARCHAR,
  p_priority INTEGER DEFAULT 5,
  p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO email_queue (
    notification_id,
    user_id,
    email_address,
    notification_type,
    priority,
    scheduled_at
  ) VALUES (
    p_notification_id,
    p_user_id,
    p_email_address,
    p_notification_type,
    p_priority,
    p_scheduled_at
  ) RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending emails for processing
CREATE OR REPLACE FUNCTION get_pending_emails(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  notification_id UUID,
  user_id UUID,
  email_address VARCHAR,
  notification_type VARCHAR,
  priority INTEGER,
  attempts INTEGER,
  max_attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eq.id,
    eq.notification_id,
    eq.user_id,
    eq.email_address,
    eq.notification_type,
    eq.priority,
    eq.attempts,
    eq.max_attempts
  FROM email_queue eq
  WHERE eq.status = 'pending'
    AND eq.scheduled_at <= NOW()
    AND eq.attempts < eq.max_attempts
  ORDER BY eq.priority ASC, eq.scheduled_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to mark email as processed
CREATE OR REPLACE FUNCTION mark_email_processed(
  p_queue_id UUID,
  p_status VARCHAR,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE email_queue
  SET 
    status = p_status,
    error_message = p_error_message,
    processed_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default email templates
INSERT INTO email_templates (name, notification_type, subject_template, html_template, text_template) VALUES
('booking_created', 'booking_created', 'New Booking: {{booking_title}}', '<h1>New Booking Created!</h1><p>{{message}}</p>', 'New Booking: {{booking_title}}\n\n{{message}}'),
('booking_updated', 'booking_updated', 'Booking Updated: {{booking_title}}', '<h1>Booking Updated</h1><p>{{message}}</p>', 'Booking Updated: {{booking_title}}\n\n{{message}}'),
('booking_cancelled', 'booking_cancelled', 'Booking Cancelled: {{booking_title}}', '<h1>Booking Cancelled</h1><p>{{message}}</p>', 'Booking Cancelled: {{booking_title}}\n\n{{message}}'),
('booking_confirmed', 'booking_confirmed', 'Booking Confirmed: {{booking_title}}', '<h1>Booking Confirmed!</h1><p>{{message}}</p>', 'Booking Confirmed: {{booking_title}}\n\n{{message}}'),
('booking_reminder', 'booking_reminder', 'Booking Reminder: {{booking_title}}', '<h1>Booking Reminder</h1><p>{{message}}</p>', 'Booking Reminder: {{booking_title}}\n\n{{message}}'),
('task_created', 'task_created', 'New Task: {{task_title}}', '<h1>New Task Created</h1><p>{{message}}</p>', 'New Task: {{task_title}}\n\n{{message}}'),
('task_completed', 'task_completed', 'Task Completed: {{task_title}}', '<h1>Task Completed!</h1><p>{{message}}</p>', 'Task Completed: {{task_title}}\n\n{{message}}'),
('milestone_completed', 'milestone_completed', 'Milestone Completed: {{milestone_title}}', '<h1>Milestone Completed!</h1><p>{{message}}</p>', 'Milestone Completed: {{milestone_title}}\n\n{{message}}'),
('payment_received', 'payment_received', 'Payment Received: {{amount}} {{currency}}', '<h1>Payment Received!</h1><p>{{message}}</p>', 'Payment Received: {{amount}} {{currency}}\n\n{{message}}'),
('payment_failed', 'payment_failed', 'Payment Failed: {{amount}} {{currency}}', '<h1>Payment Failed</h1><p>{{message}}</p>', 'Payment Failed: {{amount}} {{currency}}\n\n{{message}}'),
('invoice_created', 'invoice_created', 'New Invoice: {{invoice_number}}', '<h1>New Invoice Created</h1><p>{{message}}</p>', 'New Invoice: {{invoice_number}}\n\n{{message}}'),
('invoice_overdue', 'invoice_overdue', 'Overdue Invoice: {{invoice_number}}', '<h1>Overdue Invoice</h1><p>{{message}}</p>', 'Overdue Invoice: {{invoice_number}}\n\n{{message}}');

-- Create default email preferences for existing users
INSERT INTO email_preferences (user_id, email_address, is_verified, email_template_style, send_time_preference)
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL,
  'modern',
  'immediate'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM email_preferences);

-- Success message
SELECT '✅ Email notification system created successfully!' as status;
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
