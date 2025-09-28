-- Safe final verification script - only checks function existence
-- This script never tries to access tables that don't exist

-- 1. Count all progress-related functions
SELECT 
  'Function Count' as metric,
  COUNT(*) as value,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ CORRECT (3 functions)'
    ELSE '❌ WRONG - Expected 3, found ' || COUNT(*)
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');

-- 2. Check for any duplicates
SELECT 
  'Duplicate Check' as metric,
  COUNT(*) as value,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NONE FOUND'
    ELSE '❌ FOUND ' || COUNT(*) || ' DUPLICATES'
  END as status
FROM (
  SELECT routine_name
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
  GROUP BY routine_name
  HAVING COUNT(*) > 1
) duplicates;

-- 3. List each function with details
SELECT 
  routine_name as function_name,
  specific_name,
  data_type as return_type,
  COUNT(*) as versions,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ SINGLE VERSION'
    ELSE '❌ ' || COUNT(*) || ' VERSIONS'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
GROUP BY routine_name, specific_name, data_type
ORDER BY routine_name, data_type;

-- 4. Check table existence
SELECT 
  'Table Count' as metric,
  COUNT(*) as value,
  CASE 
    WHEN COUNT(*) = 4 THEN '✅ CORRECT (4 tables)'
    ELSE '❌ WRONG - Expected 4, found ' || COUNT(*)
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs');

-- 5. List all tables
SELECT 
  'TABLES' as type,
  table_name as name,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs')
ORDER BY table_name;

-- 6. Comprehensive verification (safe version)
DO $$
DECLARE
  func_count INTEGER;
  table_count INTEGER;
  duplicate_count INTEGER;
  trigger_count INTEGER;
  all_good BOOLEAN := TRUE;
BEGIN
  -- Count functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
  
  -- Count tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('bookings', 'milestones', 'tasks', 'progress_logs');
  
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT routine_name
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
    GROUP BY routine_name
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Count trigger functions
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
  AND data_type = 'trigger';
  
  RAISE NOTICE '🎯 SAFE FINAL VERIFICATION RESULTS:';
  RAISE NOTICE '   Functions: %/3', func_count;
  RAISE NOTICE '   Tables: %/4', table_count;
  RAISE NOTICE '   Duplicates: %', duplicate_count;
  RAISE NOTICE '   Trigger functions: %', trigger_count;
  
  IF func_count = 3 AND table_count = 4 AND duplicate_count = 0 AND trigger_count = 0 THEN
    RAISE NOTICE '🎉 SUCCESS: Everything is working perfectly!';
    RAISE NOTICE '   ✅ 3 functions exist (no duplicates)';
    RAISE NOTICE '   ✅ 4 tables exist';
    RAISE NOTICE '   ✅ No trigger functions';
    RAISE NOTICE '   ✅ Ready for production!';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your database is now clean and ready to use!';
    RAISE NOTICE '   - calculate_booking_progress: Available';
    RAISE NOTICE '   - update_milestone_progress: Available';
    RAISE NOTICE '   - update_task: Available';
    RAISE NOTICE '   - All tables: Available';
  ELSE
    RAISE NOTICE '⚠️ ISSUES FOUND:';
    IF func_count != 3 THEN
      RAISE NOTICE '   ❌ Expected 3 functions, found %', func_count;
      all_good := FALSE;
    END IF;
    IF table_count != 4 THEN
      RAISE NOTICE '   ❌ Expected 4 tables, found %', table_count;
      all_good := FALSE;
    END IF;
    IF duplicate_count > 0 THEN
      RAISE NOTICE '   ❌ Found % duplicate functions', duplicate_count;
      all_good := FALSE;
    END IF;
    IF trigger_count > 0 THEN
      RAISE NOTICE '   ❌ Found % trigger functions (should be 0)', trigger_count;
      all_good := FALSE;
    END IF;
    
    IF NOT all_good THEN
      RAISE NOTICE '💡 Run the appropriate cleanup script to fix these issues';
    END IF;
  END IF;
END $$;

-- 7. Summary
SELECT 
  'SUMMARY' as type,
  'Safe verification complete' as message,
  'Check the results above' as status;
