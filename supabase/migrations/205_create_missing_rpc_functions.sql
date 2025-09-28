-- Create missing RPC functions for backend-driven progress system
-- Migration: 205_create_missing_rpc_functions.sql

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS can_transition(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS can_transition(text, text, text);
DROP FUNCTION IF EXISTS recalc_milestone_progress(UUID);
DROP FUNCTION IF EXISTS recalc_milestone_progress(uuid);
DROP FUNCTION IF EXISTS calculate_booking_progress(UUID);
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);

-- Create can_transition function
CREATE OR REPLACE FUNCTION can_transition(
  current_status TEXT,
  new_status TEXT,
  entity_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Define valid transitions for tasks
  IF entity_type = 'task' THEN
    RETURN CASE
      WHEN current_status = 'pending' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status = 'in_progress' AND new_status IN ('completed', 'cancelled', 'on_hold') THEN TRUE
      WHEN current_status = 'on_hold' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status = 'cancelled' THEN FALSE -- Cannot transition from cancelled
      WHEN current_status = 'completed' THEN FALSE -- Cannot transition from completed
      ELSE FALSE
    END;
  END IF;
  
  -- Define valid transitions for milestones
  IF entity_type = 'milestone' THEN
    RETURN CASE
      WHEN current_status = 'pending' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status = 'in_progress' AND new_status IN ('completed', 'cancelled', 'on_hold') THEN TRUE
      WHEN current_status = 'on_hold' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status = 'cancelled' THEN FALSE -- Cannot transition from cancelled
      WHEN current_status = 'completed' THEN FALSE -- Cannot transition from completed
      ELSE FALSE
    END;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create recalc_milestone_progress function
CREATE OR REPLACE FUNCTION recalc_milestone_progress(p_milestone_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  milestone_record RECORD;
  total_tasks INTEGER := 0;
  completed_tasks INTEGER := 0;
  in_progress_tasks INTEGER := 0;
  pending_tasks INTEGER := 0;
  overdue_tasks INTEGER := 0;
  total_estimated_hours NUMERIC := 0;
  total_actual_hours NUMERIC := 0;
  new_progress INTEGER := 0;
  new_status TEXT;
  result JSONB;
BEGIN
  -- Get milestone details
  SELECT * INTO milestone_record
  FROM public.milestones
  WHERE id = p_milestone_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone with id % not found', p_milestone_id;
  END IF;
  
  -- Count tasks and calculate progress
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN is_overdue = TRUE THEN 1 END) as overdue,
    COALESCE(SUM(estimated_hours), 0) as estimated,
    COALESCE(SUM(actual_hours), 0) as actual
  INTO total_tasks, completed_tasks, in_progress_tasks, pending_tasks, overdue_tasks, total_estimated_hours, total_actual_hours
  FROM public.tasks
  WHERE milestone_id = p_milestone_id;
  
  -- Calculate progress percentage
  IF total_tasks = 0 THEN
    new_progress := 0;
  ELSE
    new_progress := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  END IF;
  
  -- Determine new status
  IF total_tasks = 0 THEN
    new_status := 'pending';
  ELSIF completed_tasks = total_tasks THEN
    new_status := 'completed';
  ELSIF in_progress_tasks > 0 OR completed_tasks > 0 THEN
    new_status := 'in_progress';
  ELSE
    new_status := 'pending';
  END IF;
  
  -- Update milestone
  UPDATE public.milestones
  SET 
    progress_percentage = new_progress,
    status = new_status,
    updated_at = NOW()
  WHERE id = p_milestone_id;
  
  -- Return result
  result := jsonb_build_object(
    'milestone_id', p_milestone_id,
    'old_progress', milestone_record.progress_percentage,
    'new_progress', new_progress,
    'old_status', milestone_record.status,
    'new_status', new_status,
    'total_tasks', total_tasks,
    'completed_tasks', completed_tasks,
    'in_progress_tasks', in_progress_tasks,
    'pending_tasks', pending_tasks,
    'overdue_tasks', overdue_tasks,
    'total_estimated_hours', total_estimated_hours,
    'total_actual_hours', total_actual_hours,
    'updated_at', NOW()
  );
  
  RETURN result;
END;
$$;

-- Create calculate_booking_progress function
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  total_weight INTEGER := 0;
  weighted_progress NUMERIC := 0;
  new_progress INTEGER;
BEGIN
  -- Get booking details
  SELECT * INTO booking_record
  FROM public.bookings
  WHERE id = booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking with id % not found', booking_id;
  END IF;
  
  -- Calculate weighted progress from milestones
  SELECT 
    COALESCE(SUM(m.weight), 0) as total_weight,
    COALESCE(SUM(m.progress_percentage * m.weight), 0) as weighted_progress
  INTO total_weight, weighted_progress
  FROM public.milestones m
  WHERE m.booking_id = calculate_booking_progress.booking_id;
  
  -- Calculate new progress percentage
  IF total_weight = 0 THEN
    new_progress := 0;
  ELSE
    new_progress := ROUND(weighted_progress / total_weight);
  END IF;
  
  -- Update booking with new progress
  UPDATE public.bookings
  SET 
    progress_percentage = new_progress,
    updated_at = NOW()
  WHERE id = calculate_booking_progress.booking_id;
  
  -- Return the new progress as integer (for compatibility with existing code)
  RETURN new_progress;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_transition(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION recalc_milestone_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_progress(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION can_transition(TEXT, TEXT, TEXT) IS 'Validates if a status transition is allowed for tasks or milestones';
COMMENT ON FUNCTION recalc_milestone_progress(UUID) IS 'Recalculates milestone progress based on task completion and updates status';
COMMENT ON FUNCTION calculate_booking_progress(UUID) IS 'Calculates weighted progress across all milestones for a booking and updates the bookings table';
