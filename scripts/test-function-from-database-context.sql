-- Test if calculate_booking_progress works from within database functions
-- This will simulate the same context as the 16 functions that call it

-- Test 1: Call the function directly from a DO block (simulates function context)
DO $$
DECLARE
  test_booking_id uuid := 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
  result INTEGER;
BEGIN
  RAISE NOTICE '🧪 TEST 1: Calling calculate_booking_progress from DO block';
  RAISE NOTICE '   Test booking ID: %', test_booking_id;
  
  BEGIN
    SELECT calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE '✅ SUCCESS: Function works from DO block context';
    RAISE NOTICE '   Result: %', result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ FAILED: Function not accessible from DO block: %', SQLERRM;
      RAISE NOTICE '   Error code: %', SQLSTATE;
  END;
END $$;

-- Test 2: Create a test function that calls calculate_booking_progress
CREATE OR REPLACE FUNCTION public.test_calculate_booking_progress(test_booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  result INTEGER;
BEGIN
  -- This simulates what the 16 functions are doing
  SELECT calculate_booking_progress(test_booking_id) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test 3: Call the test function
DO $$
DECLARE
  test_booking_id uuid := 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
  result INTEGER;
BEGIN
  RAISE NOTICE '🧪 TEST 2: Calling calculate_booking_progress from test function';
  RAISE NOTICE '   Test booking ID: %', test_booking_id;
  
  BEGIN
    SELECT public.test_calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE '✅ SUCCESS: Function works from test function context';
    RAISE NOTICE '   Result: %', result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ FAILED: Function not accessible from test function: %', SQLERRM;
      RAISE NOTICE '   Error code: %', SQLSTATE;
  END;
END $$;

-- Test 4: Test one of the actual functions that was failing
DO $$
DECLARE
  test_booking_id uuid := 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
  result INTEGER;
BEGIN
  RAISE NOTICE '🧪 TEST 3: Testing update_milestone_progress function';
  RAISE NOTICE '   This function calls calculate_booking_progress internally';
  
  -- First, check if we have any milestones for this booking
  IF EXISTS (SELECT 1 FROM milestones WHERE booking_id = test_booking_id) THEN
    BEGIN
      -- Get a milestone ID for testing
      DECLARE
        milestone_id uuid;
      BEGIN
        SELECT id INTO milestone_id FROM milestones WHERE booking_id = test_booking_id LIMIT 1;
        
        -- Call update_milestone_progress which should call calculate_booking_progress
        PERFORM update_milestone_progress(milestone_id);
        
        RAISE NOTICE '✅ SUCCESS: update_milestone_progress worked (calls calculate_booking_progress internally)';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '❌ FAILED: update_milestone_progress failed: %', SQLERRM;
          RAISE NOTICE '   Error code: %', SQLSTATE;
      END;
    END;
  ELSE
    RAISE NOTICE '⚠️ No milestones found for booking % - skipping update_milestone_progress test', test_booking_id;
  END IF;
END $$;

-- Clean up test function
DROP FUNCTION IF EXISTS public.test_calculate_booking_progress(uuid);

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '🎉 FUNCTION PERMISSION TEST COMPLETE';
  RAISE NOTICE '   If all tests passed, the 42883 error should be resolved';
  RAISE NOTICE '   All 16 database functions should now be able to call calculate_booking_progress';
END $$;
