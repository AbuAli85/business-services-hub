-- Create progress functions without testing
-- This migration creates the essential progress functions without running tests

-- 1. Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
DROP FUNCTION IF EXISTS calculate_booking_progress(UUID);
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);
DROP FUNCTION IF EXISTS update_milestone_progress(UUID);
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz, text);

-- 2. Create calculate_booking_progress function
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

-- 3. Create update_milestone_progress function
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  new_progress_percentage INTEGER;
  booking_uuid uuid;
BEGIN
  -- Get the booking_id for this milestone
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_uuid;
  
  -- Count total and completed tasks
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks, completed_tasks
  FROM tasks 
  WHERE milestone_id = milestone_uuid;

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
  
  -- Update booking progress if we have a booking_id
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create update_task function
CREATE OR REPLACE FUNCTION update_task(
  task_id uuid,
  title text DEFAULT NULL,
  status text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL,
  progress_percentage integer DEFAULT NULL
) RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  -- Update the task
  UPDATE tasks
  SET 
    title = COALESCE(update_task.title, tasks.title),
    status = COALESCE(update_task.status, tasks.status),
    due_date = COALESCE(update_task.due_date, tasks.due_date),
    progress_percentage = COALESCE(update_task.progress_percentage, tasks.progress_percentage),
    updated_at = now()
  WHERE id = task_id
  RETURNING milestone_id INTO m_id;

  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = m_id;

  -- Update milestone and booking progress
  IF m_id IS NOT NULL THEN
    PERFORM update_milestone_progress(m_id);
  END IF;
  
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz, integer) TO authenticated;

-- 6. Add comments for documentation
COMMENT ON FUNCTION calculate_booking_progress(uuid) IS 'Calculates weighted progress across all milestones for a booking and updates the bookings table';
COMMENT ON FUNCTION update_milestone_progress(uuid) IS 'Updates milestone progress based on task completion and triggers booking progress update';
COMMENT ON FUNCTION update_task(uuid, text, text, timestamptz, integer) IS 'Updates a task and triggers milestone and booking progress updates';
