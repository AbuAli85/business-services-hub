-- Simple function status checker
-- This version is more robust and handles schema differences

-- 1. Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;

-- 2. Check for duplicates (simplified)
SELECT 
  routine_name,
  COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
GROUP BY routine_name
ORDER BY routine_name;

-- 3. Test function calls (if data exists)
DO $$
DECLARE
  test_booking_id uuid;
  test_milestone_id uuid;
  test_task_id uuid;
  result INTEGER;
  booking_count INTEGER;
  milestone_count INTEGER;
  task_count INTEGER;
  func_exists BOOLEAN;
BEGIN
  -- Check if functions exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'calculate_booking_progress'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE NOTICE '❌ calculate_booking_progress function does not exist';
  ELSE
    RAISE NOTICE '✅ calculate_booking_progress function exists';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_milestone_progress'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE NOTICE '❌ update_milestone_progress function does not exist';
  ELSE
    RAISE NOTICE '✅ update_milestone_progress function exists';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_task'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE NOTICE '❌ update_task function does not exist';
  ELSE
    RAISE NOTICE '✅ update_task function exists';
  END IF;
  
  -- Count available data
  BEGIN
    SELECT COUNT(*) INTO booking_count FROM bookings;
    RAISE NOTICE '📊 Found % bookings', booking_count;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '⚠️ bookings table does not exist';
      booking_count := 0;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO milestone_count FROM milestones;
    RAISE NOTICE '📊 Found % milestones', milestone_count;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '⚠️ milestones table does not exist';
      milestone_count := 0;
  END;
  
  BEGIN
    SELECT COUNT(*) INTO task_count FROM tasks;
    RAISE NOTICE '📊 Found % tasks', task_count;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE '⚠️ tasks table does not exist';
      task_count := 0;
  END;
  
  -- Test calculate_booking_progress if we have bookings
  IF booking_count > 0 THEN
    SELECT id INTO test_booking_id FROM bookings LIMIT 1;
    
    BEGIN
      SELECT calculate_booking_progress(test_booking_id) INTO result;
      RAISE NOTICE '✅ calculate_booking_progress works: booking_id=%, result=%', test_booking_id, result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ calculate_booking_progress failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '⚠️ No bookings available for testing calculate_booking_progress';
  END IF;
  
  -- Test update_milestone_progress if we have milestones
  IF milestone_count > 0 THEN
    SELECT id INTO test_milestone_id FROM milestones LIMIT 1;
    
    BEGIN
      PERFORM update_milestone_progress(test_milestone_id);
      RAISE NOTICE '✅ update_milestone_progress works: milestone_id=%', test_milestone_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ update_milestone_progress failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '⚠️ No milestones available for testing update_milestone_progress';
  END IF;
  
  -- Test update_task if we have tasks
  IF task_count > 0 THEN
    SELECT id INTO test_task_id FROM tasks LIMIT 1;
    
    BEGIN
      PERFORM update_task(test_task_id, 'Test Update', 'completed');
      RAISE NOTICE '✅ update_task works: task_id=%', test_task_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ update_task failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '⚠️ No tasks available for testing update_task';
  END IF;
  
END $$;

-- 4. Show function definitions (if they exist)
SELECT 
  routine_name,
  LEFT(routine_definition, 200) || '...' as definition_preview
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;
