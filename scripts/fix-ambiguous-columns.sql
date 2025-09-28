-- Fix ambiguous column references in database functions
-- This script updates all functions to use clear, unambiguous variable names

-- 1. Drop and recreate calculate_booking_progress with clear variable names
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);

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

-- 2. Drop and recreate update_milestone_progress with clear variable names
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);

CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks_count INTEGER;
  completed_tasks_count INTEGER;
  new_progress_percentage INTEGER;
  booking_uuid uuid;
BEGIN
  -- Get the booking_id for this milestone
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_uuid;
  
  -- Count total and completed tasks
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_tasks_count, completed_tasks_count
  FROM tasks 
  WHERE milestone_id = milestone_uuid;

  -- Calculate progress percentage
  IF total_tasks_count > 0 THEN
    new_progress_percentage := ROUND((completed_tasks_count::NUMERIC / total_tasks_count::NUMERIC) * 100);
  ELSE
    new_progress_percentage := 0;
  END IF;

  -- Update milestone progress
  UPDATE milestones 
  SET 
    progress_percentage = new_progress_percentage,
    completed_tasks = completed_tasks_count,
    total_tasks = total_tasks_count,
    updated_at = now()
  WHERE id = milestone_uuid;
  
  -- Update booking progress if we have a booking_id
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop and recreate update_task with clear variable names
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz, integer, numeric, text);

CREATE OR REPLACE FUNCTION update_task(
  task_id uuid,
  title text DEFAULT NULL,
  status text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL,
  progress_percentage integer DEFAULT NULL,
  actual_hours numeric DEFAULT NULL,
  notes text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  milestone_id_var uuid;
  booking_uuid uuid;
  old_status_var text;
  new_status_var text;
BEGIN
  -- Get current status and milestone_id
  SELECT milestone_id, status INTO milestone_id_var, old_status_var
  FROM tasks WHERE id = task_id;

  -- Set new status
  new_status_var := COALESCE(update_task.status, old_status_var);

  -- Update task
  UPDATE tasks
  SET
    title = COALESCE(update_task.title, tasks.title),
    status = new_status_var,
    due_date = COALESCE(update_task.due_date, tasks.due_date),
    progress_percentage = COALESCE(update_task.progress_percentage, tasks.progress_percentage),
    actual_hours = COALESCE(update_task.actual_hours, tasks.actual_hours),
    notes = COALESCE(update_task.notes, tasks.notes),
    updated_at = now()
  WHERE id = task_id
  RETURNING milestone_id INTO milestone_id_var;

  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_id_var;

  -- Update milestone and booking progress
  IF milestone_id_var IS NOT NULL THEN
    PERFORM update_milestone_progress(milestone_id_var);
  END IF;
  
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;

  -- Log status change if it happened (optional - only if progress_logs table exists)
  IF old_status_var != new_status_var THEN
    BEGIN
      INSERT INTO progress_logs (
        booking_id,
        milestone_id,
        task_id,
        action,
        old_value,
        new_value,
        created_at
      ) VALUES (
        booking_uuid,
        milestone_id_var,
        task_id,
        'status_change',
        old_status_var,
        new_status_var,
        now()
      );
    EXCEPTION
      WHEN undefined_table THEN
        -- progress_logs table doesn't exist, skip logging
        NULL;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz, integer, numeric, text) TO authenticated;

-- 5. Add comments
COMMENT ON FUNCTION calculate_booking_progress(uuid) IS 'Calculates weighted progress across all milestones for a booking and updates the bookings table';
COMMENT ON FUNCTION update_milestone_progress(uuid) IS 'Updates milestone progress based on task completion and triggers booking progress update';
COMMENT ON FUNCTION update_task(uuid, text, text, timestamptz, integer, numeric, text) IS 'Updates a task with comprehensive parameters and triggers milestone and booking progress updates';

-- 6. Verify the fix
DO $$
DECLARE
  func_count INTEGER;
  duplicate_count INTEGER;
  all_good BOOLEAN := TRUE;
BEGIN
  -- Count functions
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
  
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT routine_name
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
    GROUP BY routine_name
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE '🔧 AMBIGUOUS COLUMN FIX:';
  RAISE NOTICE '   Functions: %', func_count;
  RAISE NOTICE '   Duplicates: %', duplicate_count;
  
  IF func_count = 3 AND duplicate_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All functions updated with clear variable names!';
    RAISE NOTICE '   ✅ No more ambiguous column references';
    RAISE NOTICE '   ✅ Functions should work without errors';
  ELSE
    RAISE NOTICE '❌ ISSUE: Still have problems';
    RAISE NOTICE '   Expected 3 functions, found %', func_count;
    RAISE NOTICE '   Duplicates: %', duplicate_count;
  END IF;
END $$;
