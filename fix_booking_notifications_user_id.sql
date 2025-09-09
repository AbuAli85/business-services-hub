-- Add missing user_id column to booking_notifications table
-- Run this in your Supabase SQL Editor

-- Add user_id column to booking_notifications
ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add other missing columns that might be needed
ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT;

ALTER TABLE booking_notifications 
ADD COLUMN IF NOT EXISTS action_label VARCHAR(100);

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
