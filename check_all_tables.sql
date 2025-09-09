-- Check all tables that might be missing the priority column
-- Run this in your Supabase SQL Editor

-- Check all tables in public schema
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name LIKE '%notification%'
ORDER BY table_name, ordinal_position;

-- Check if there are any other tables with similar structure
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (column_name = 'type' OR column_name = 'title' OR column_name = 'message')
AND table_name != 'notifications'
ORDER BY table_name, ordinal_position;

-- Check for any views that might be causing issues
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%notification%';
