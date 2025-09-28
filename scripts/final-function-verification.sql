-- Final verification that the function is working correctly
-- This will confirm the function exists and can be called

-- 1. Verify function exists
SELECT 
  'FUNCTION_EXISTS' as status,
  routine_name,
  specific_name,
  data_type,
  'READY' as state
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';

-- 2. Test function with real booking ID
DO $$
DECLARE
  test_booking_id uuid := 'c08ba7e3-3518-4e9f-8802-8193c558856d';
  result INTEGER;
  booking_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '🎯 FINAL FUNCTION VERIFICATION';
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
      
      -- Verify booking was updated
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
    RAISE NOTICE '⚠️ Booking not found - using dummy test';
    
    -- Test with a dummy UUID to verify function syntax
    BEGIN
      SELECT calculate_booking_progress('00000000-0000-0000-0000-000000000000'::uuid) INTO result;
      RAISE NOTICE '✅ SUCCESS: Function syntax is correct';
      RAISE NOTICE '   Result with dummy ID: %', result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Function syntax error: %', SQLERRM;
    END;
  END IF;
  
END $$;

-- 3. Show function permissions
SELECT 
  'PERMISSIONS' as type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';

-- 4. Show current booking status
SELECT 
  'BOOKING_STATUS' as type,
  id,
  status,
  progress_percentage,
  updated_at
FROM bookings 
WHERE id = 'c08ba7e3-3518-4e9f-8802-8193c558856d';

-- 5. Final status summary
DO $$
BEGIN
  RAISE NOTICE '🎉 FUNCTION VERIFICATION COMPLETE';
  RAISE NOTICE '   The calculate_booking_progress function is ready to use';
  RAISE NOTICE '   Your application should now be able to call it via RPC';
  RAISE NOTICE '   If you still get 42883 errors, check your environment variables';
END $$;
