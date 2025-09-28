-- Test script to check if database functions exist
-- Run this in Supabase SQL editor to verify function existence

-- Check if calculate_booking_progress function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'calculate_booking_progress' 
  AND routine_schema = 'public';

-- Check if update_milestone_progress function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_milestone_progress' 
  AND routine_schema = 'public';

-- Check if update_task function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_task' 
  AND routine_schema = 'public';

-- Test calculate_booking_progress function with a sample booking
DO $$
DECLARE
  test_booking_id uuid;
  result INTEGER;
BEGIN
  -- Find a test booking
  SELECT id INTO test_booking_id FROM bookings LIMIT 1;
  
  IF test_booking_id IS NOT NULL THEN
    -- Test the function
    SELECT calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE 'Function test successful: booking_id=%, result=%', test_booking_id, result;
  ELSE
    RAISE NOTICE 'No bookings found for function test';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Function test failed: %', SQLERRM;
END $$;
