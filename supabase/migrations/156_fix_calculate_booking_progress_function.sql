-- Fix calculate_booking_progress function
-- This migration ensures the calculate_booking_progress function exists and is properly defined

-- Drop existing function if it exists with different signatures
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
DROP FUNCTION IF EXISTS calculate_booking_progress(UUID);
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid, text);

-- Create the calculate_booking_progress function
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
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
      COALESCE(progress_percentage, 0) as progress_percentage,
      COALESCE(weight, 1) as weight
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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_booking_progress(uuid) IS 'Calculates weighted progress across all milestones for a booking and updates the bookings table';

-- Test the function (optional - can be removed in production)
DO $$
DECLARE
  test_booking_id uuid;
  result INTEGER;
BEGIN
  -- Find a test booking if any exist
  SELECT id INTO test_booking_id FROM bookings LIMIT 1;
  
  IF test_booking_id IS NOT NULL THEN
    -- Test the function
    SELECT calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE 'Function test successful: booking_id=%, result=%', test_booking_id, result;
  ELSE
    RAISE NOTICE 'No bookings found for function test';
  END IF;
END $$;
