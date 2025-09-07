-- Check what sequences exist in the database
-- This will help identify the correct sequence names

-- 1. List all sequences in the public schema
SELECT 
  'Available Sequences:' as info,
  schemaname,
  sequencename,
  data_type,
  start_value,
  minimum_value,
  maximum_value,
  increment
FROM pg_sequences 
WHERE schemaname = 'public'
ORDER BY sequencename;

-- 2. Check if time_entries table uses a sequence for its ID
SELECT 
  'Time Entries Table Info:' as info,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'time_entries'
  AND column_name = 'id';

-- 3. Check for any sequences that might be related to time_entries
SELECT 
  'Time Entries Related Sequences:' as info,
  schemaname,
  sequencename
FROM pg_sequences 
WHERE schemaname = 'public' 
  AND (sequencename LIKE '%time%' OR sequencename LIKE '%entry%')
ORDER BY sequencename;

-- 4. Check all table sequences
SELECT 
  'All Table Sequences:' as info,
  t.table_name,
  c.column_name,
  c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND c.column_default LIKE 'nextval%'
  AND t.table_name IN ('time_entries', 'milestones', 'tasks', 'progress_logs')
ORDER BY t.table_name, c.column_name;
