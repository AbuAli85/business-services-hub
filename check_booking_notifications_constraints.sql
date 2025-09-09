-- Check the constraints on booking_notifications table
-- Run this in your Supabase SQL Editor

-- Check what constraints exist on the type column
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'booking_notifications'::regclass
AND conname LIKE '%type%';

-- Check the table structure and constraints
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'booking_notifications' 
ORDER BY ordinal_position;

-- Check if there are any existing values in the type column
SELECT DISTINCT type, COUNT(*) as count
FROM booking_notifications 
GROUP BY type
ORDER BY type;
