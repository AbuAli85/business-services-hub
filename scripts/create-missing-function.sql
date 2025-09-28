-- Create the missing calculate_booking_progress function
-- This is a simple, focused script to create just this one function

-- Drop if exists (just in case)
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);

-- Create the function
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  total_weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_record RECORD;
  final_progress INTEGER;
BEGIN
  -- Loop through all milestones for this booking
  FOR milestone_record IN
    SELECT 
      COALESCE(progress_percentage, 0) as progress_percentage,
      COALESCE(weight, 1) as weight
    FROM milestones
    WHERE milestones.booking_id = calculate_booking_progress.booking_id
  LOOP
    -- Add weighted progress
    total_weighted_progress := total_weighted_progress + 
      (milestone_record.progress_percentage * milestone_record.weight);
    
    -- Add weight
    total_weight := total_weight + milestone_record.weight;
  END LOOP;
  
  -- Calculate final progress percentage
  IF total_weight > 0 THEN
    final_progress := ROUND((total_weighted_progress / total_weight)::NUMERIC);
  ELSE
    final_progress := 0;
  END IF;
  
  -- Ensure progress is between 0 and 100
  final_progress := GREATEST(0, LEAST(100, final_progress));
  
  -- Update the booking with the calculated progress
  UPDATE bookings 
  SET 
    progress_percentage = final_progress,
    updated_at = now()
  WHERE id = booking_id;
  
  RETURN final_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO service_role;

-- Test the function
DO $$
DECLARE
  test_booking_id uuid;
  result INTEGER;
  booking_count INTEGER;
BEGIN
  -- Check if we have any bookings to test with
  SELECT COUNT(*) INTO booking_count FROM bookings;
  
  IF booking_count > 0 THEN
    -- Get a test booking ID
    SELECT id INTO test_booking_id FROM bookings LIMIT 1;
    
    -- Test the function
    BEGIN
      SELECT calculate_booking_progress(test_booking_id) INTO result;
      RAISE NOTICE '✅ SUCCESS: calculate_booking_progress function created and tested';
      RAISE NOTICE '   Test booking ID: %', test_booking_id;
      RAISE NOTICE '   Result: %', result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Function created but test failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE '✅ SUCCESS: calculate_booking_progress function created';
    RAISE NOTICE '⚠️ No bookings available for testing';
  END IF;
END $$;

-- Verify the function exists
SELECT 
  'VERIFICATION' as status,
  routine_name as function_name,
  specific_name as signature,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';
