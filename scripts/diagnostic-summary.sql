-- Diagnostic summary - shows exactly what's in your database
-- This will give you a clear picture of your current state

-- 1. Function summary
SELECT 
  'FUNCTIONS' as category,
  routine_name as name,
  data_type as return_type,
  'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;

-- 2. Table summary
SELECT 
  'TABLES' as category,
  table_name as name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs')
ORDER BY table_name;

-- 3. Count summary
SELECT 
  'COUNTS' as category,
  'Functions: ' || COUNT(*) as name,
  'EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')

UNION ALL

SELECT 
  'COUNTS' as category,
  'Tables: ' || COUNT(*) as name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs');

-- 4. Duplicate check
SELECT 
  'DUPLICATES' as category,
  CASE 
    WHEN COUNT(*) = 0 THEN 'None found'
    ELSE COUNT(*) || ' duplicates found'
  END as name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ GOOD'
    ELSE '❌ ISSUE'
  END as status
FROM (
  SELECT routine_name
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
  GROUP BY routine_name
  HAVING COUNT(*) > 1
) duplicates;

-- 5. Trigger check
SELECT 
  'TRIGGERS' as category,
  CASE 
    WHEN COUNT(*) = 0 THEN 'None found'
    ELSE COUNT(*) || ' trigger functions found'
  END as name,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ GOOD'
    ELSE '❌ ISSUE'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
  AND data_type = 'trigger';

-- 6. Overall status
DO $$
DECLARE
  func_count INTEGER;
  table_count INTEGER;
  duplicate_count INTEGER;
  trigger_count INTEGER;
  overall_status TEXT;
BEGIN
  -- Count everything
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
  
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs');
  
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT routine_name
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
    GROUP BY routine_name
    HAVING COUNT(*) > 1
  ) duplicates;
  
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
  AND data_type = 'trigger';
  
  -- Determine overall status
  IF func_count = 3 AND table_count = 4 AND duplicate_count = 0 AND trigger_count = 0 THEN
    overall_status := '🎉 PERFECT - All systems ready!';
  ELSIF func_count = 3 AND duplicate_count = 0 AND trigger_count = 0 THEN
    overall_status := '✅ FUNCTIONS READY - Tables may be missing';
  ELSIF func_count = 3 THEN
    overall_status := '⚠️ FUNCTIONS READY - Some issues remain';
  ELSE
    overall_status := '❌ ISSUES FOUND - Cleanup needed';
  END IF;
  
  RAISE NOTICE '🎯 DIAGNOSTIC SUMMARY:';
  RAISE NOTICE '   Functions: %/3', func_count;
  RAISE NOTICE '   Tables: %/4', table_count;
  RAISE NOTICE '   Duplicates: %', duplicate_count;
  RAISE NOTICE '   Triggers: %', trigger_count;
  RAISE NOTICE '   Status: %', overall_status;
  
  IF func_count = 3 AND table_count = 4 AND duplicate_count = 0 AND trigger_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🚀 CONGRATULATIONS!';
    RAISE NOTICE '   Your database is completely clean and ready for production!';
    RAISE NOTICE '   All functions and tables are working correctly.';
  ELSIF func_count = 3 AND duplicate_count = 0 AND trigger_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '💡 NEXT STEP:';
    RAISE NOTICE '   Your functions are perfect! If you need tables, run:';
    RAISE NOTICE '   supabase migration up 161';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ACTION NEEDED:';
    RAISE NOTICE '   Run the appropriate cleanup script to fix the issues above.';
  END IF;
END $$;
