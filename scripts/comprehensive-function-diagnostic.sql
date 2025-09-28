-- Comprehensive diagnostic for calculate_booking_progress function
-- This will help identify why the function isn't being found

-- 1. Check if function exists with exact signature
SELECT 
  'EXACT_SIGNATURE_CHECK' as check_type,
  routine_name,
  specific_name,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress'
  AND data_type = 'integer';

-- 2. Check all functions with similar names
SELECT 
  'SIMILAR_FUNCTIONS' as check_type,
  routine_name,
  specific_name,
  data_type,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%calculate%'
  AND routine_name LIKE '%progress%';

-- 3. Check function parameters
SELECT 
  'FUNCTION_PARAMETERS' as check_type,
  p.specific_name,
  p.parameter_name,
  p.data_type,
  p.parameter_mode,
  p.ordinal_position
FROM information_schema.parameters p
JOIN information_schema.routines r ON p.specific_name = r.specific_name
WHERE r.routine_schema = 'public' 
  AND r.routine_name = 'calculate_booking_progress'
ORDER BY p.ordinal_position;

-- 4. Check if function is callable
DO $$
DECLARE
  function_exists BOOLEAN := FALSE;
  test_booking_id uuid := 'c08ba7e3-3518-4e9f-8802-8193c558856d';
  result INTEGER;
BEGIN
  RAISE NOTICE '🔍 COMPREHENSIVE FUNCTION DIAGNOSTIC';
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'calculate_booking_progress'
    AND data_type = 'integer'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ Function exists in information_schema';
    
    -- Try to call the function
    BEGIN
      SELECT calculate_booking_progress(test_booking_id) INTO result;
      RAISE NOTICE '✅ Function is callable, result: %', result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Function call failed: %', SQLERRM;
        RAISE NOTICE '   Error code: %', SQLSTATE;
    END;
  ELSE
    RAISE NOTICE '❌ Function not found in information_schema';
  END IF;
  
  -- Check permissions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges 
    WHERE routine_schema = 'public' 
    AND routine_name = 'calculate_booking_progress'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ Function has permissions set';
  ELSE
    RAISE NOTICE '⚠️ No permissions found for function';
  END IF;
  
END $$;

-- 5. Check for any conflicting functions
SELECT 
  'CONFLICTING_FUNCTIONS' as check_type,
  routine_name,
  specific_name,
  data_type,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';

-- 6. Try to recreate the function with explicit signature
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO anon;

-- 7. Final verification
SELECT 
  'FINAL_VERIFICATION' as check_type,
  routine_name,
  specific_name,
  data_type,
  'RECREATED' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';

-- 8. Test the recreated function
DO $$
DECLARE
  test_booking_id uuid := 'c08ba7e3-3518-4e9f-8802-8193c558856d';
  result INTEGER;
BEGIN
  RAISE NOTICE '🧪 TESTING RECREATED FUNCTION';
  
  BEGIN
    SELECT calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE '✅ SUCCESS: Function works after recreation';
    RAISE NOTICE '   Result: %', result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Function still fails: %', SQLERRM;
  END;
END $$;
