-- Check function status and identify duplicates
-- Run this in Supabase SQL editor to verify function status

-- 1. Check all progress-related functions
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  specific_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%progress%'
  OR routine_name LIKE '%task%'
  OR routine_name LIKE '%milestone%'
ORDER BY routine_name, specific_name;

-- 2. Check for duplicate function names
SELECT 
  routine_name,
  COUNT(*) as function_count,
  array_agg(specific_name) as specific_names
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
GROUP BY routine_name
HAVING COUNT(*) > 1;

-- 3. Check function parameters
SELECT 
  p.specific_name,
  r.routine_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode,
  p.ordinal_position
FROM information_schema.parameters p
JOIN information_schema.routines r ON p.specific_name = r.specific_name
WHERE p.specific_schema = 'public'
  AND r.routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY r.routine_name, p.ordinal_position;

-- 4. Test function existence and basic functionality
DO $$
DECLARE
  test_booking_id uuid;
  test_milestone_id uuid;
  test_task_id uuid;
  result INTEGER;
  booking_count INTEGER;
  milestone_count INTEGER;
  task_count INTEGER;
BEGIN
  -- Count available data
  SELECT COUNT(*) INTO booking_count FROM bookings;
  SELECT COUNT(*) INTO milestone_count FROM milestones;
  SELECT COUNT(*) INTO task_count FROM tasks;
  
  RAISE NOTICE 'Data available: % bookings, % milestones, % tasks', booking_count, milestone_count, task_count;
  
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

-- 5. Show function signatures
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;
