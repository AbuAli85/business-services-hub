-- Check for active triggers that might be calling calculate_booking_progress
-- This will help identify which triggers are causing the 42883 error

-- 1. Check for triggers on milestones table
SELECT 
  'MILESTONE_TRIGGERS' as type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'milestones'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 2. Check for triggers on tasks table
SELECT 
  'TASK_TRIGGERS' as type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'tasks'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 3. Check for triggers on bookings table
SELECT 
  'BOOKING_TRIGGERS' as type,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'bookings'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- 4. Check for functions that call calculate_booking_progress
SELECT 
  'FUNCTIONS_CALLING_CALCULATE' as type,
  routine_name,
  specific_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition LIKE '%calculate_booking_progress%'
ORDER BY routine_name;

-- 5. Test if the function is accessible from within a function
DO $$
DECLARE
  test_booking_id uuid := 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
  result INTEGER;
BEGIN
  RAISE NOTICE '🧪 TESTING calculate_booking_progress from within a function';
  RAISE NOTICE '   Test booking ID: %', test_booking_id;
  
  BEGIN
    SELECT calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE '✅ SUCCESS: Function is accessible from within functions';
    RAISE NOTICE '   Result: %', result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Function not accessible from within functions: %', SQLERRM;
      RAISE NOTICE '   Error code: %', SQLSTATE;
  END;
END $$;
