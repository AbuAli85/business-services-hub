-- Add priority column to progress_notifications table
-- Run this in your Supabase SQL Editor

-- Add priority column to progress_notifications
ALTER TABLE progress_notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Add other missing columns if needed
ALTER TABLE progress_notifications 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE progress_notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE progress_notifications 
ADD COLUMN IF NOT EXISTS action_label VARCHAR(100);

-- Verify the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'progress_notifications' 
ORDER BY ordinal_position;
