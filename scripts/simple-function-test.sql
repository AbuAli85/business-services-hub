-- Simple test to verify the function is working
-- This will test the function with a real booking ID

-- Test the function with the specific booking ID from your error
DO $$
DECLARE
  test_booking_id uuid := 'c08ba7e3-3518-4e9f-8802-8193c558856d';
  result INTEGER;
  booking_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '🧪 TESTING calculate_booking_progress function';
  RAISE NOTICE '   Test booking ID: %', test_booking_id;
  
  -- Check if booking exists
  SELECT EXISTS (
    SELECT 1 FROM bookings WHERE id = test_booking_id
  ) INTO booking_exists;
  
  IF booking_exists THEN
    RAISE NOTICE '✅ Booking exists in database';
    
    -- Test the function
    BEGIN
      SELECT calculate_booking_progress(test_booking_id) INTO result;
      RAISE NOTICE '✅ SUCCESS: Function executed successfully';
      RAISE NOTICE '   Calculated progress: %', result;
      
      -- Check if booking was updated
      SELECT progress_percentage INTO result
      FROM bookings 
      WHERE id = test_booking_id;
      
      RAISE NOTICE '   Booking progress updated to: %', result;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Function test failed: %', SQLERRM;
        RAISE NOTICE '   Error code: %', SQLSTATE;
    END;
    
  ELSE
    RAISE NOTICE '⚠️ Booking not found in database';
    RAISE NOTICE '   This might be why the original error occurred';
  END IF;
  
END $$;

-- Show the function signature that should be used
SELECT 
  'FUNCTION_SIGNATURE' as type,
  routine_name as function_name,
  specific_name as signature,
  data_type as return_type,
  'Use this exact signature: calculate_booking_progress(uuid)' as usage_note
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';

-- Show current booking status
SELECT 
  'CURRENT_BOOKING_STATUS' as type,
  id,
  status,
  progress_percentage,
  updated_at
FROM bookings 
WHERE id = 'c08ba7e3-3518-4e9f-8802-8193c558856d';
