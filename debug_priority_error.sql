-- Debug script to find the source of the priority column error
-- Run this in your Supabase SQL Editor

-- Check if there are any functions that reference priority
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_definition LIKE '%priority%';

-- Check if there are any views that reference priority
SELECT 
  table_name,
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
AND view_definition LIKE '%priority%';

-- Check if there are any triggers that might be causing issues
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND action_statement LIKE '%priority%';

-- Check the exact structure of progress_notifications table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'progress_notifications' 
ORDER BY ordinal_position;

-- Test a simple query on progress_notifications to see if it has priority
SELECT * FROM progress_notifications LIMIT 1;
