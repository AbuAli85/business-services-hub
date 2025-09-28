-- Quick status check - shows exactly what's in your database
-- Run this to see the current state

-- 1. Show all progress-related functions
SELECT 
  'FUNCTIONS' as type,
  routine_name as name,
  specific_name as signature,
  'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name, specific_name;

-- 2. Show all progress-related tables
SELECT 
  'TABLES' as type,
  table_name as name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs')
ORDER BY table_name;

-- 3. Count summary
SELECT 
  'SUMMARY' as type,
  'Functions: ' || COUNT(*) as name,
  'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')

UNION ALL

SELECT 
  'SUMMARY' as type,
  'Tables: ' || COUNT(*) as name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs');
