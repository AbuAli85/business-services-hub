-- Fix can_transition function error
-- This script fixes the function signature mismatch

-- 1. Drop existing problematic functions and triggers
DROP TRIGGER IF EXISTS trigger_enforce_milestone_transition ON public.milestones;
DROP TRIGGER IF EXISTS trigger_enforce_task_transition ON public.tasks;
DROP FUNCTION IF EXISTS enforce_milestone_transition();
DROP FUNCTION IF EXISTS enforce_task_transition();
DROP FUNCTION IF EXISTS can_transition(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS can_transition(text, text, text);

-- 2. Create the can_transition function with proper signature
CREATE OR REPLACE FUNCTION can_transition(
  current_status TEXT,
  new_status TEXT,
  entity_type TEXT DEFAULT 'task'
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
      WHEN current_status = 'cancelled' THEN FALSE
      WHEN current_status = 'completed' THEN FALSE
      ELSE FALSE
    END;
  END IF;
  
  -- Define valid transitions for milestones
  IF entity_type = 'milestone' THEN
    RETURN CASE
      WHEN current_status = 'pending' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status = 'in_progress' AND new_status IN ('completed', 'cancelled', 'on_hold') THEN TRUE
      WHEN current_status = 'on_hold' AND new_status IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status = 'cancelled' THEN FALSE
      WHEN current_status = 'completed' THEN FALSE
      ELSE FALSE
    END;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION can_transition(TEXT, TEXT, TEXT) TO authenticated;