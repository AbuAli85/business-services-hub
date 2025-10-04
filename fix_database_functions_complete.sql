-- Complete fix for database functions and triggers
-- Run this in Supabase SQL Editor to fix the can_transition function error

-- 1. Drop all existing functions and triggers
DROP TRIGGER IF EXISTS trigger_enforce_milestone_transition ON public.milestones;
DROP TRIGGER IF EXISTS trigger_enforce_task_transition ON public.tasks;
DROP FUNCTION IF EXISTS enforce_milestone_transition();
DROP FUNCTION IF EXISTS enforce_task_transition();
DROP FUNCTION IF EXISTS can_transition(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS can_transition(text, text, text);
DROP FUNCTION IF EXISTS can_transition(anyelement, anyelement, anyelement);

-- 2. Create the can_transition function with proper type handling
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

-- 3. Create the task transition enforcement function
CREATE OR REPLACE FUNCTION enforce_task_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only check transitions for status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Validate the transition
    IF NOT can_transition(OLD.status::TEXT, NEW.status::TEXT, 'task'::TEXT) THEN
      RAISE EXCEPTION 'Invalid status transition from % to % for task', OLD.status, NEW.status;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Create the milestone transition enforcement function
CREATE OR REPLACE FUNCTION enforce_milestone_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only check transitions for status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Validate the transition with explicit type casting
    IF NOT can_transition(OLD.status::TEXT, NEW.status::TEXT, 'milestone'::TEXT) THEN
      RAISE EXCEPTION 'Invalid status transition from % to % for milestone', OLD.status, NEW.status;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. Recreate the triggers
CREATE TRIGGER trigger_enforce_task_transition
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION enforce_task_transition();

CREATE TRIGGER trigger_enforce_milestone_transition
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION enforce_milestone_transition();

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION can_transition(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION enforce_task_transition() TO authenticated;
GRANT EXECUTE ON FUNCTION enforce_milestone_transition() TO authenticated;

-- 7. Add comments
COMMENT ON FUNCTION can_transition(TEXT, TEXT, TEXT) IS 'Validates if a status transition is allowed for tasks and milestones';
COMMENT ON FUNCTION enforce_task_transition() IS 'Enforces valid status transitions for tasks';
COMMENT ON FUNCTION enforce_milestone_transition() IS 'Enforces valid status transitions for milestones';
