-- Test database functions with valid UUIDs
-- Run this in Supabase SQL editor to test function execution

-- 1. Check if functions exist
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
ORDER BY routine_name;

-- 2. Test with actual data (if available)
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
      RAISE NOTICE 'calculate_booking_progress test successful: booking_id=%, result=%', test_booking_id, result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'calculate_booking_progress test failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No bookings available for testing calculate_booking_progress';
  END IF;
  
  -- Test update_milestone_progress if we have milestones
  IF milestone_count > 0 THEN
    SELECT id INTO test_milestone_id FROM milestones LIMIT 1;
    
    BEGIN
      PERFORM update_milestone_progress(test_milestone_id);
      RAISE NOTICE 'update_milestone_progress test successful: milestone_id=%', test_milestone_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'update_milestone_progress test failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No milestones available for testing update_milestone_progress';
  END IF;
  
  -- Test update_task if we have tasks
  IF task_count > 0 THEN
    SELECT id INTO test_task_id FROM tasks LIMIT 1;
    
    BEGIN
      PERFORM update_task(test_task_id, 'Test Update', 'completed');
      RAISE NOTICE 'update_task test successful: task_id=%', test_task_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'update_task test failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No tasks available for testing update_task';
  END IF;
  
END $$;

-- 3. Show sample data for manual testing
SELECT 'Sample Bookings' as data_type, id, status, project_progress 
FROM bookings 
LIMIT 3;

SELECT 'Sample Milestones' as data_type, id, title, progress_percentage, status 
FROM milestones 
LIMIT 3;

SELECT 'Sample Tasks' as data_type, id, title, status, progress_percentage 
FROM tasks 
LIMIT 3;
