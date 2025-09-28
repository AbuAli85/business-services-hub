-- Fix all progress tracking functions
-- This migration ensures all essential progress functions exist and are properly defined

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

-- 3. Create update_milestone_progress function
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_percentage INTEGER;
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
    progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    progress_percentage := 0;
  END IF;

  -- Update milestone progress
  UPDATE milestones 
  SET 
    progress_percentage = progress_percentage,
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

-- 5. Create add_task function
CREATE OR REPLACE FUNCTION add_task(
  milestone_id uuid,
  title text,
  description text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL,
  priority text DEFAULT 'normal',
  estimated_hours integer DEFAULT NULL
) RETURNS uuid AS $$
DECLARE 
  new_id uuid;
  booking_uuid uuid;
BEGIN
  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_id;
  
  -- Insert new task
  INSERT INTO tasks (
    milestone_id,
    title,
    description,
    due_date,
    priority,
    estimated_hours,
    status,
    progress_percentage,
    created_at,
    updated_at
  ) VALUES (
    milestone_id,
    title,
    description,
    due_date,
    priority,
    estimated_hours,
    'pending',
    0,
    now(),
    now()
  ) RETURNING id INTO new_id;
  
  -- Update milestone and booking progress
  PERFORM update_milestone_progress(milestone_id);
  
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create delete_task function
CREATE OR REPLACE FUNCTION delete_task(task_id uuid)
RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  -- Get milestone_id before deletion
  SELECT milestone_id INTO m_id FROM tasks WHERE id = task_id;
  
  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = m_id;
  
  -- Delete the task
  DELETE FROM tasks WHERE id = task_id;
  
  -- Update milestone and booking progress
  IF m_id IS NOT NULL THEN
    PERFORM update_milestone_progress(m_id);
  END IF;
  
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION add_task(uuid, text, text, timestamptz, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_task(uuid) TO authenticated;

-- 8. Add comments for documentation
COMMENT ON FUNCTION calculate_booking_progress(uuid) IS 'Calculates weighted progress across all milestones for a booking and updates the bookings table';
COMMENT ON FUNCTION update_milestone_progress(uuid) IS 'Updates milestone progress based on task completion and triggers booking progress update';
COMMENT ON FUNCTION update_task(uuid, text, text, timestamptz, integer) IS 'Updates a task and triggers milestone and booking progress updates';
COMMENT ON FUNCTION add_task(uuid, text, text, timestamptz, text, integer) IS 'Adds a new task to a milestone and triggers progress updates';
COMMENT ON FUNCTION delete_task(uuid) IS 'Deletes a task and triggers milestone and booking progress updates';

-- 9. Test the functions (optional - can be removed in production)
-- Only run tests if the required tables exist
DO $$
DECLARE
  test_booking_id uuid;
  test_milestone_id uuid;
  test_task_id uuid;
  result INTEGER;
  tables_exist BOOLEAN := FALSE;
BEGIN
  -- Check if required tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('bookings', 'milestones', 'tasks')
  ) INTO tables_exist;
  
  IF NOT tables_exist THEN
    RAISE NOTICE 'Required tables (bookings, milestones, tasks) do not exist. Skipping function tests.';
    RETURN;
  END IF;
  
  -- Find test data if any exist
  SELECT id INTO test_booking_id FROM bookings LIMIT 1;
  
  IF test_booking_id IS NOT NULL THEN
    -- Test calculate_booking_progress
    BEGIN
      SELECT calculate_booking_progress(test_booking_id) INTO result;
      RAISE NOTICE 'calculate_booking_progress test successful: booking_id=%, result=%', test_booking_id, result;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'calculate_booking_progress test failed: %', SQLERRM;
    END;
    
    -- Find a milestone for testing (only if milestones table exists)
    BEGIN
      SELECT id INTO test_milestone_id FROM milestones WHERE booking_id = test_booking_id LIMIT 1;
      
      IF test_milestone_id IS NOT NULL THEN
        -- Test update_milestone_progress
        PERFORM update_milestone_progress(test_milestone_id);
        RAISE NOTICE 'update_milestone_progress test successful: milestone_id=%', test_milestone_id;
        
        -- Find a task for testing (only if tasks table exists)
        BEGIN
          SELECT id INTO test_task_id FROM tasks WHERE milestone_id = test_milestone_id LIMIT 1;
          
          IF test_task_id IS NOT NULL THEN
            -- Test update_task
            PERFORM update_task(test_task_id, 'Test Update', 'completed');
            RAISE NOTICE 'update_task test successful: task_id=%', test_task_id;
          ELSE
            RAISE NOTICE 'No tasks found for testing';
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Task testing failed: %', SQLERRM;
        END;
      ELSE
        RAISE NOTICE 'No milestones found for testing';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Milestone testing failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No bookings found for function testing';
  END IF;
END $$;
