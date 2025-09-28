-- Fix function permissions to ensure it's accessible from within other functions
-- This should resolve the 42883 error when called from triggers or other functions

-- 1. Ensure the function exists with correct signature
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

-- 2. Grant all necessary permissions
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO anon;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO service_role;

-- 3. Set function owner to postgres to ensure it's accessible
ALTER FUNCTION calculate_booking_progress(uuid) OWNER TO postgres;

-- 4. Test the function from within a function context
DO $$
DECLARE
  test_booking_id uuid := 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';
  result INTEGER;
BEGIN
  RAISE NOTICE '🧪 TESTING calculate_booking_progress after permission fix';
  RAISE NOTICE '   Test booking ID: %', test_booking_id;
  
  BEGIN
    SELECT calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE '✅ SUCCESS: Function is now accessible from within functions';
    RAISE NOTICE '   Result: %', result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Function still not accessible: %', SQLERRM;
      RAISE NOTICE '   Error code: %', SQLSTATE;
  END;
END $$;

-- 5. Show final permissions
SELECT 
  'FINAL_PERMISSIONS' as type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress'
ORDER BY grantee;
