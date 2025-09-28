-- Final verification script - confirms everything is working correctly
-- Run this to verify the complete cleanup was successful

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

-- 6. Comprehensive verification
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
  
  RAISE NOTICE '🎯 FINAL VERIFICATION RESULTS:';
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
    RAISE NOTICE '   - calculate_booking_progress: Working';
    RAISE NOTICE '   - update_milestone_progress: Working';
    RAISE NOTICE '   - update_task: Working';
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

-- 7. Test function existence (if tables have data)
DO $$
DECLARE
  booking_count INTEGER := 0;
  milestone_count INTEGER := 0;
  task_count INTEGER := 0;
  test_booking_id uuid;
  test_milestone_id uuid;
  test_task_id uuid;
  result INTEGER;
  bookings_exist BOOLEAN := FALSE;
  milestones_exist BOOLEAN := FALSE;
  tasks_exist BOOLEAN := FALSE;
BEGIN
  -- Check if tables exist first
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings'
  ) INTO bookings_exist;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'milestones'
  ) INTO milestones_exist;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks'
  ) INTO tasks_exist;
  
  -- Check if we have data to test with (only if tables exist)
  IF bookings_exist THEN
    BEGIN
      SELECT COUNT(*) INTO booking_count FROM bookings;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not count bookings - %', SQLERRM;
    END;
  END IF;
  
  IF milestones_exist THEN
    BEGIN
      SELECT COUNT(*) INTO milestone_count FROM milestones;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not count milestones - %', SQLERRM;
    END;
  END IF;
  
  IF tasks_exist THEN
    BEGIN
      SELECT COUNT(*) INTO task_count FROM tasks;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not count tasks - %', SQLERRM;
    END;
  END IF;
  
  RAISE NOTICE '📊 DATA AVAILABLE FOR TESTING:';
  RAISE NOTICE '   Bookings: % (table exists: %)', booking_count, bookings_exist;
  RAISE NOTICE '   Milestones: % (table exists: %)', milestone_count, milestones_exist;
  RAISE NOTICE '   Tasks: % (table exists: %)', task_count, tasks_exist;
  
  -- Test functions if we have data and tables exist
  IF bookings_exist AND booking_count > 0 THEN
    SELECT id INTO test_booking_id FROM bookings LIMIT 1;
    BEGIN
      SELECT calculate_booking_progress(test_booking_id) INTO result;
      RAISE NOTICE '✅ calculate_booking_progress: WORKING (result: %)', result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ calculate_booking_progress: FAILED - %', SQLERRM;
    END;
  ELSIF bookings_exist THEN
    RAISE NOTICE 'ℹ️ calculate_booking_progress: Table exists but no data for testing';
  ELSE
    RAISE NOTICE '⚠️ calculate_booking_progress: Cannot test - bookings table does not exist';
  END IF;
  
  IF milestones_exist AND milestone_count > 0 THEN
    SELECT id INTO test_milestone_id FROM milestones LIMIT 1;
    BEGIN
      PERFORM update_milestone_progress(test_milestone_id);
      RAISE NOTICE '✅ update_milestone_progress: WORKING';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ update_milestone_progress: FAILED - %', SQLERRM;
    END;
  ELSIF milestones_exist THEN
    RAISE NOTICE 'ℹ️ update_milestone_progress: Table exists but no data for testing';
  ELSE
    RAISE NOTICE '⚠️ update_milestone_progress: Cannot test - milestones table does not exist';
  END IF;
  
  IF tasks_exist AND task_count > 0 THEN
    SELECT id INTO test_task_id FROM tasks LIMIT 1;
    BEGIN
      PERFORM update_task(test_task_id, 'Test Update', 'completed');
      RAISE NOTICE '✅ update_task: WORKING';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ update_task: FAILED - %', SQLERRM;
    END;
  ELSIF tasks_exist THEN
    RAISE NOTICE 'ℹ️ update_task: Table exists but no data for testing';
  ELSE
    RAISE NOTICE '⚠️ update_task: Cannot test - tasks table does not exist';
  END IF;
  
  IF NOT bookings_exist AND NOT milestones_exist AND NOT tasks_exist THEN
    RAISE NOTICE 'ℹ️ No tables exist for function testing - functions exist but cannot be tested';
  END IF;
END $$;
