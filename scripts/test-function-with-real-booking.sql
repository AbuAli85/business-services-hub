-- Test the calculate_booking_progress function with the real booking ID
-- This will verify the function works with your actual data

-- Test with the specific booking ID from your error
DO $$
DECLARE
  test_booking_id uuid := 'c08ba7e3-3518-4e9f-8802-8193c558856d';
  result INTEGER;
  booking_exists BOOLEAN := FALSE;
  milestone_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🧪 TESTING calculate_booking_progress function';
  RAISE NOTICE '   Test booking ID: %', test_booking_id;
  
  -- Check if booking exists
  SELECT EXISTS (
    SELECT 1 FROM bookings WHERE id = test_booking_id
  ) INTO booking_exists;
  
  IF booking_exists THEN
    RAISE NOTICE '✅ Booking exists in database';
    
    -- Count milestones for this booking
    SELECT COUNT(*) INTO milestone_count
    FROM milestones 
    WHERE booking_id = test_booking_id;
    
    RAISE NOTICE '   Milestones found: %', milestone_count;
    
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

-- Show current booking status
SELECT 
  'BOOKING_STATUS' as type,
  id,
  status,
  progress_percentage,
  updated_at
FROM bookings 
WHERE id = 'c08ba7e3-3518-4e9f-8802-8193c558856d';

-- Show milestones for this booking
SELECT 
  'MILESTONES' as type,
  id,
  title,
  progress_percentage,
  weight,
  status
FROM milestones 
WHERE booking_id = 'c08ba7e3-3518-4e9f-8802-8193c558856d'
ORDER BY created_at;

-- Final verification that function exists and is callable
SELECT 
  'FUNCTION_VERIFICATION' as type,
  routine_name as function_name,
  specific_name as signature,
  data_type as return_type,
  'READY' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';
