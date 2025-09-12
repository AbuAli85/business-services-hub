-- Add missing columns to the notification table that's missing them
-- Run this in your Supabase SQL Editor

-- Add priority column
ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Add other missing columns
ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS action_label VARCHAR(100);

-- Add updated_at column if missing
ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verify the table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'booking_notifications' 
ORDER BY ordinal_position;
