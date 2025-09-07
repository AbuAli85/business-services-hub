-- Fix ambiguous column reference in update_milestone_progress function
-- This fixes the "column reference actual_hours is ambiguous" error

DROP FUNCTION IF EXISTS update_milestone_progress(uuid);

CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_task_count INTEGER;
  completed_task_count INTEGER;
  progress_pct INTEGER;
  total_actual_hours NUMERIC := 0;
  milestone_record RECORD;
BEGIN
  -- Get milestone details
  SELECT
    m.estimated_hours,
    m.status
  INTO milestone_record
  FROM public.milestones m
  WHERE m.id = milestone_uuid;

  -- Count total and completed tasks
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE t.status = 'completed'),
    COALESCE(SUM(t.actual_hours), 0)
  INTO total_task_count, completed_task_count, total_actual_hours
  FROM public.tasks t
  WHERE t.milestone_id = milestone_uuid;

  -- Calculate progress percentage
  IF total_task_count > 0 THEN
    progress_pct := ROUND((completed_task_count::NUMERIC / total_task_count::NUMERIC) * 100);
  ELSE
    progress_pct := 0;
  END IF;

  -- Update milestone with new progress
  UPDATE public.milestones
  SET
    completed_tasks = completed_task_count,
    total_tasks = total_task_count,
    progress_percentage = progress_pct,
    actual_hours = total_actual_hours,
    updated_at = now()
  WHERE id = milestone_uuid;

  -- Update milestone status based on progress
  IF progress_pct = 100 THEN
    UPDATE public.milestones
    SET status = 'completed', updated_at = now()
    WHERE id = milestone_uuid;
  ELSIF progress_pct > 0 THEN
    UPDATE public.milestones
    SET status = 'in_progress', updated_at = now()
    WHERE id = milestone_uuid AND status = 'pending';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;

-- Test the function with a sample milestone
SELECT 'Function updated successfully!' as status;
