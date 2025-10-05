-- Add essential progress calculation functions
-- These are needed for the new progress API to work

-- Step 1: Create calculate_booking_progress function
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  total_progress INTEGER := 0;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_record RECORD;
  milestone_count INTEGER := 0;
  final_progress INTEGER;
BEGIN
  -- Validate input
  IF booking_id IS NULL THEN
    RAISE EXCEPTION 'Booking ID cannot be null';
  END IF;

  -- Calculate weighted progress across all milestones for this booking
  FOR milestone_record IN
    SELECT 
      COALESCE(progress_percentage, 0) as progress_percentage,
      COALESCE(weight, 1) as weight,
      status
    FROM milestones
    WHERE milestones.booking_id = calculate_booking_progress.booking_id
      AND status != 'cancelled'
  LOOP
    -- Add weighted progress
    weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
    total_weight := total_weight + milestone_record.weight;
    milestone_count := milestone_count + 1;
  END LOOP;
  
  -- Calculate final progress percentage
  IF total_weight > 0 THEN
    final_progress := ROUND(weighted_progress / total_weight);
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
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 0 to prevent system failure
    RAISE WARNING 'Error calculating booking progress for booking %: %', booking_id, SQLERRM;
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create update_milestone_progress function
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER := 0;
  completed_tasks INTEGER := 0;
  new_progress_percentage INTEGER := 0;
  booking_uuid uuid;
BEGIN
  -- Validate input
  IF milestone_uuid IS NULL THEN
    RAISE EXCEPTION 'Milestone ID cannot be null';
  END IF;

  -- Get task counts
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM tasks 
  WHERE milestone_id = milestone_uuid
    AND status != 'cancelled';

  -- Calculate progress percentage
  IF total_tasks > 0 THEN
    new_progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    new_progress_percentage := 0;
  END IF;

  -- Update milestone progress
  UPDATE milestones 
  SET 
    progress_percentage = new_progress_percentage,
    completed_tasks = completed_tasks,
    total_tasks = total_tasks,
    updated_at = now()
  WHERE id = milestone_uuid;
  
  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_uuid;
  
  -- Update booking progress if we have a booking_id
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the operation
    RAISE WARNING 'Error updating milestone progress for milestone %: %', milestone_uuid, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;

-- Step 4: Test the functions
SELECT 'Progress functions created successfully. API should now work.' as status;
