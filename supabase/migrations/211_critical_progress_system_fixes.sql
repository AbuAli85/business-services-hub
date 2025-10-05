-- Critical Progress System Fixes
-- This migration addresses the most critical issues in the milestones and tasks progress system

-- 1. Clean up duplicate and conflicting functions
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid) CASCADE;
DROP FUNCTION IF EXISTS calculate_booking_progress(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_milestone_progress(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_milestone_progress(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz) CASCADE;
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz, text) CASCADE;
DROP FUNCTION IF EXISTS recalc_milestone_progress(uuid) CASCADE;

-- 2. Create optimized progress calculation functions

-- Calculate booking progress with proper error handling
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

-- Update milestone progress with proper error handling
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

-- Update task with proper error handling and progress cascade
CREATE OR REPLACE FUNCTION update_task(
  task_id uuid,
  title text DEFAULT NULL,
  status text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL,
  progress_percentage INTEGER DEFAULT NULL,
  actual_hours NUMERIC DEFAULT NULL,
  notes text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
  old_status text;
  new_status text;
BEGIN
  -- Validate input
  IF task_id IS NULL THEN
    RAISE EXCEPTION 'Task ID cannot be null';
  END IF;

  -- Get current status and milestone_id
  SELECT milestone_id, status INTO m_id, old_status
  FROM tasks WHERE id = task_id;

  -- Validate task exists
  IF m_id IS NULL THEN
    RAISE EXCEPTION 'Task not found: %', task_id;
  END IF;

  -- Set new status
  new_status := COALESCE(update_task.status, old_status);

  -- Update task
  UPDATE tasks
  SET
    title = COALESCE(update_task.title, tasks.title),
    status = new_status,
    due_date = COALESCE(update_task.due_date, tasks.due_date),
    progress_percentage = COALESCE(update_task.progress_percentage, tasks.progress_percentage),
    actual_hours = COALESCE(update_task.actual_hours, tasks.actual_hours),
    notes = COALESCE(update_task.notes, tasks.notes),
    updated_at = now()
  WHERE id = task_id;

  -- Get booking_id for progress update
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = m_id;

  -- Update milestone and booking progress
  PERFORM update_milestone_progress(m_id);
  
  -- Log status change if it happened
  IF old_status != new_status THEN
    RAISE NOTICE 'Task % status changed from % to %', task_id, old_status, new_status;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and re-raise to maintain transaction integrity
    RAISE WARNING 'Error updating task %: %', task_id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions to all necessary roles
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO anon;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO anon;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz, integer, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz, integer, numeric, text) TO anon;

-- 4. Create optimized indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id_progress ON milestones(booking_id, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id_status ON tasks(milestone_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone_id_progress ON tasks(milestone_id, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_bookings_progress_updated ON bookings(progress_percentage, updated_at);

-- 5. Create materialized view for progress analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_booking_progress_analytics AS
SELECT 
  b.id as booking_id,
  b.title as booking_title,
  b.progress_percentage as booking_progress,
  b.status as booking_status,
  COUNT(m.id) as total_milestones,
  COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as completed_milestones,
  COUNT(CASE WHEN m.status = 'in_progress' THEN 1 END) as in_progress_milestones,
  COUNT(CASE WHEN m.status = 'pending' THEN 1 END) as pending_milestones,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
  COUNT(CASE WHEN t.is_overdue = TRUE THEN 1 END) as overdue_tasks,
  COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
  COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
  COALESCE(AVG(m.progress_percentage), 0) as avg_milestone_progress,
  COALESCE(AVG(t.progress_percentage), 0) as avg_task_progress,
  b.created_at,
  b.updated_at
FROM bookings b
LEFT JOIN milestones m ON m.booking_id = b.id
LEFT JOIN tasks t ON t.milestone_id = m.id
GROUP BY b.id, b.title, b.progress_percentage, b.status, b.created_at, b.updated_at;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_mv_booking_progress_analytics_booking_id ON mv_booking_progress_analytics(booking_id);
CREATE INDEX IF NOT EXISTS idx_mv_booking_progress_analytics_status ON mv_booking_progress_analytics(booking_status);

-- 6. Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_booking_progress_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_booking_progress_analytics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to refresh materialized view
GRANT EXECUTE ON FUNCTION refresh_booking_progress_analytics() TO authenticated;

-- 7. Add comments for documentation
COMMENT ON FUNCTION calculate_booking_progress(uuid) IS 'Calculates weighted progress across all milestones for a booking with proper error handling';
COMMENT ON FUNCTION update_milestone_progress(uuid) IS 'Updates milestone progress based on task completion with cascade to booking progress';
COMMENT ON FUNCTION update_task(uuid, text, text, timestamptz, integer, numeric, text) IS 'Updates task with proper progress cascade and error handling';
COMMENT ON MATERIALIZED VIEW mv_booking_progress_analytics IS 'Materialized view for booking progress analytics with aggregated milestone and task data';

-- 8. Create trigger to automatically refresh materialized view
CREATE OR REPLACE FUNCTION trigger_refresh_booking_analytics()
RETURNS trigger AS $$
BEGIN
  -- Refresh materialized view asynchronously
  PERFORM pg_notify('refresh_booking_analytics', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for bookings table
DROP TRIGGER IF EXISTS trigger_refresh_booking_analytics_trigger ON bookings;
CREATE TRIGGER trigger_refresh_booking_analytics_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_booking_analytics();
