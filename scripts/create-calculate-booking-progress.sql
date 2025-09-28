-- Create calculate_booking_progress function step by step
-- This script creates only the calculate_booking_progress function

-- 1. Drop existing function if it exists
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);

-- 2. Create the function
CREATE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  total_progress INTEGER;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_record RECORD;
  milestone_count INTEGER := 0;
BEGIN
  -- Calculate weighted progress across all milestones for this booking
  FOR milestone_record IN
    SELECT 
      COALESCE(milestones.progress_percentage, 0) as progress_percentage,
      COALESCE(milestones.weight, 1) as weight
    FROM milestones
    WHERE milestones.booking_id = calculate_booking_progress.booking_id
  LOOP
    weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
    total_weight := total_weight + milestone_record.weight;
    milestone_count := milestone_count + 1;
  END LOOP;
  
  -- Calculate average progress
  IF total_weight > 0 THEN
    total_progress := ROUND(weighted_progress / total_weight);
  ELSE
    total_progress := 0;
  END IF;
  
  -- Return 0 if no milestones exist
  IF milestone_count = 0 THEN
    total_progress := 0;
  END IF;
  
  -- Update the bookings table with the calculated progress
  UPDATE bookings 
  SET 
    project_progress = total_progress,
    updated_at = now()
  WHERE id = booking_id;
  
  RETURN total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;

-- 4. Add comment
COMMENT ON FUNCTION calculate_booking_progress(uuid) IS 'Calculates weighted progress across all milestones for a booking and updates the bookings table';

-- 5. Verify the function was created
DO $$
DECLARE
  func_exists BOOLEAN;
  func_count INTEGER;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'calculate_booking_progress'
  ) INTO func_exists;
  
  -- Count total functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';
  
  RAISE NOTICE '🔧 CALCULATE_BOOKING_PROGRESS FUNCTION:';
  RAISE NOTICE '   Function exists: %', func_exists;
  RAISE NOTICE '   Function count: %', func_count;
  
  IF func_exists AND func_count = 1 THEN
    RAISE NOTICE '✅ SUCCESS: calculate_booking_progress function created!';
    RAISE NOTICE '   ✅ Function is ready to use';
    RAISE NOTICE '   ✅ Permissions granted';
  ELSE
    RAISE NOTICE '❌ ISSUE: Function creation failed';
    RAISE NOTICE '   Expected function to exist, found: %', func_exists;
    RAISE NOTICE '   Expected 1 function, found: %', func_count;
  END IF;
END $$;

-- 6. Test the function (if tables exist)
DO $$
DECLARE
  booking_count INTEGER := 0;
  test_booking_id uuid;
  result INTEGER;
  tables_exist BOOLEAN := FALSE;
BEGIN
  -- Check if tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('bookings', 'milestones')
  ) INTO tables_exist;
  
  IF tables_exist THEN
    -- Count bookings
    SELECT COUNT(*) INTO booking_count FROM bookings;
    
    IF booking_count > 0 THEN
      -- Test the function
      SELECT id INTO test_booking_id FROM bookings LIMIT 1;
      
      BEGIN
        SELECT calculate_booking_progress(test_booking_id) INTO result;
        RAISE NOTICE '🧪 TEST: calculate_booking_progress works! Result: %', result;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '❌ TEST: calculate_booking_progress failed - %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'ℹ️ TEST: No bookings available for testing';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ TEST: Tables do not exist - cannot test function';
  END IF;
END $$;
