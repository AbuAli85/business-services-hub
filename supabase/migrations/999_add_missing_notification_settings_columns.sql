-- Add missing notification settings columns
-- This migration adds all the notification toggle columns expected by the UI

-- Add booking_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS booking_notifications BOOLEAN DEFAULT true;

-- Add payment_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS payment_notifications BOOLEAN DEFAULT true;

-- Add invoice_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS invoice_notifications BOOLEAN DEFAULT true;

-- Add message_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS message_notifications BOOLEAN DEFAULT true;

-- Add task_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS task_notifications BOOLEAN DEFAULT true;

-- Add milestone_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS milestone_notifications BOOLEAN DEFAULT true;

-- Add document_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS document_notifications BOOLEAN DEFAULT true;

-- Note: Database has 'syste_notifications' (typo), but we'll add the correct one
-- The typo column will be renamed in a cleanup migration later
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS system_notifications BOOLEAN DEFAULT true;

-- Add request_notifications column (commonly used)
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS request_notifications BOOLEAN DEFAULT true;

-- Add project_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS project_notifications BOOLEAN DEFAULT true;

-- Add review_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS review_notifications BOOLEAN DEFAULT true;

-- Add deadline_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS deadline_notifications BOOLEAN DEFAULT true;

-- Add team_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS team_notifications BOOLEAN DEFAULT true;

-- Add add activity_notifications column
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS activity_notifications BOOLEAN DEFAULT true;

-- Add comment to document the change
COMMENT ON TABLE notification_settings IS 'User notification preferences with granular control per notification type';

