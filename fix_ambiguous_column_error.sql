-- Fix Ambiguous Column Reference in Task Update Trigger
-- Error: column reference "total_tasks" is ambiguous

-- The issue is that the variable name matches the column name
-- Solution: Use qualified column names or rename variables

CREATE OR REPLACE FUNCTION public.update_milestone_progress_on_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  milestone_uuid UUID;
  task_count INTEGER := 0;                    -- Renamed from total_tasks
  completed_count INTEGER := 0;               -- Renamed from completed_tasks
  in_progress_count INTEGER := 0;             -- Renamed from in_progress_tasks
  calculated_progress INTEGER := 0;           -- Renamed from new_progress
  updated_status TEXT;                        -- Renamed from new_status
  current_status TEXT;
BEGIN
  milestone_uuid := COALESCE(NEW.milestone_id, OLD.milestone_id);
  
  IF milestone_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO current_status FROM public.milestones WHERE id = milestone_uuid;

  -- Count tasks by status (excluding cancelled)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress')
  INTO task_count, completed_count, in_progress_count
  FROM public.tasks
  WHERE milestone_id = milestone_uuid
    AND status NOT IN ('cancelled');

  -- Calculate progress percentage
  IF task_count > 0 THEN
    calculated_progress := ROUND((completed_count::NUMERIC / task_count::NUMERIC) * 100);
  ELSE
    calculated_progress := 0;
  END IF;

  -- Auto-update milestone status based on progress
  IF calculated_progress = 100 AND current_status NOT IN ('completed', 'on_hold', 'cancelled') THEN
    updated_status := 'completed';
  ELSIF calculated_progress > 0 AND calculated_progress < 100 AND current_status = 'pending' THEN
    updated_status := 'in_progress';
  ELSIF calculated_progress = 0 AND current_status = 'in_progress' AND in_progress_count = 0 THEN
    updated_status := 'pending';
  ELSE
    updated_status := current_status;
  END IF;

  -- Update milestone with qualified column names to avoid ambiguity
  UPDATE public.milestones
  SET
    progress_percentage = calculated_progress,
    total_tasks = task_count,                    -- Now unambiguous
    completed_tasks = completed_count,           -- Now unambiguous
    status = updated_status,
    completed_at = CASE WHEN updated_status = 'completed' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = milestone_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Verification: Check the function was updated
SELECT 
  'Function updated' as status,
  proname as function_name,
  pg_get_functiondef(oid) as has_qualified_names
FROM pg_proc
WHERE proname = 'update_milestone_progress_on_task_change'
  AND pronamespace = 'public'::regnamespace;

-- Test: Try updating a task
-- This should now work without the ambiguous column error
SELECT 'Trigger ready to test - try updating a task in the UI' as message;

