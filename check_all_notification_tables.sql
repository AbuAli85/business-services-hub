-- Check which notification tables have the priority column
-- Run this in your Supabase SQL Editor

-- Check booking_notifications table structure
SELECT 'booking_notifications' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'booking_notifications' 
ORDER BY ordinal_position;

-- Check user_notifications table structure  
SELECT 'user_notifications' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_notifications' 
ORDER BY ordinal_position;

-- Check notification_preferences table structure
SELECT 'notification_preferences' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notification_preferences' 
ORDER BY ordinal_position;

-- Check progress_notifications table structure
SELECT 'progress_notifications' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'progress_notifications' 
ORDER BY ordinal_position;

-- Check notification_settings table structure
SELECT 'notification_settings' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notification_settings' 
ORDER BY ordinal_position;
