-- Simple test to verify calculate_booking_progress works from database context
-- This tests the same context as the 16 functions that call it

-- Test 1: Call the function directly from a DO block (simulates function context)
DO $$
DECLARE
  test_booking_id uuid := 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
  result INTEGER;
BEGIN
  RAISE NOTICE '🧪 TEST: Calling calculate_booking_progress from DO block';
  RAISE NOTICE '   Test booking ID: %', test_booking_id;
  
  BEGIN
    SELECT calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE '✅ SUCCESS: Function works from database function context';
    RAISE NOTICE '   Result: %', result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ FAILED: Function not accessible: %', SQLERRM;
      RAISE NOTICE '   Error code: %', SQLSTATE;
  END;
END $$;

-- Test 2: Test one of the actual functions that was failing
DO $$
DECLARE
  test_booking_id uuid := 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
  milestone_id uuid;
BEGIN
  RAISE NOTICE '🧪 TEST: Testing update_milestone_progress function';
  RAISE NOTICE '   This function calls calculate_booking_progress internally';
  
  -- Check if we have any milestones for this booking
  IF EXISTS (SELECT 1 FROM milestones WHERE booking_id = test_booking_id) THEN
    BEGIN
      -- Get a milestone ID for testing
      SELECT id INTO milestone_id FROM milestones WHERE booking_id = test_booking_id LIMIT 1;
      
      -- Call update_milestone_progress which should call calculate_booking_progress
      PERFORM update_milestone_progress(milestone_id);
      
      RAISE NOTICE '✅ SUCCESS: update_milestone_progress worked';
      RAISE NOTICE '   This means calculate_booking_progress is accessible from database functions';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ FAILED: update_milestone_progress failed: %', SQLERRM;
        RAISE NOTICE '   Error code: %', SQLSTATE;
    END;
  ELSE
    RAISE NOTICE '⚠️ No milestones found for booking % - skipping update_milestone_progress test', test_booking_id;
  END IF;
END $$;

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '🎉 FUNCTION ACCESSIBILITY TEST COMPLETE';
  RAISE NOTICE '   If both tests passed, the 42883 error should be resolved';
  RAISE NOTICE '   All 16 database functions should now be able to call calculate_booking_progress';
END $$;