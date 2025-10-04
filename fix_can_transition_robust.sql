-- Robust fix for can_transition function with proper type casting
-- Run this in Supabase SQL Editor

-- Drop all existing versions
DROP FUNCTION IF EXISTS can_transition(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS can_transition(text, text, text);
DROP FUNCTION IF EXISTS can_transition(text, text, unknown);
DROP FUNCTION IF EXISTS can_transition(anyelement, anyelement, anyelement);

-- Create a more robust function that handles type casting
CREATE OR REPLACE FUNCTION can_transition(
  current_status ANYELEMENT,
  new_status ANYELEMENT,
  entity_type ANYELEMENT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  current_status_text TEXT;
  new_status_text TEXT;
  entity_type_text TEXT;
BEGIN
  -- Cast parameters to text
  current_status_text := current_status::TEXT;
  new_status_text := new_status::TEXT;
  entity_type_text := entity_type::TEXT;
  
  -- Define valid transitions for tasks
  IF entity_type_text = 'task' THEN
    RETURN CASE
      WHEN current_status_text = 'pending' AND new_status_text IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status_text = 'in_progress' AND new_status_text IN ('completed', 'cancelled', 'on_hold') THEN TRUE
      WHEN current_status_text = 'on_hold' AND new_status_text IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status_text = 'cancelled' THEN FALSE -- Cannot transition from cancelled
      WHEN current_status_text = 'completed' THEN FALSE -- Cannot transition from completed
      ELSE FALSE
    END;
  END IF;
  
  -- Define valid transitions for milestones
  IF entity_type_text = 'milestone' THEN
    RETURN CASE
      WHEN current_status_text = 'pending' AND new_status_text IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status_text = 'in_progress' AND new_status_text IN ('completed', 'cancelled', 'on_hold') THEN TRUE
      WHEN current_status_text = 'on_hold' AND new_status_text IN ('in_progress', 'cancelled') THEN TRUE
      WHEN current_status_text = 'cancelled' THEN FALSE -- Cannot transition from cancelled
      WHEN current_status_text = 'completed' THEN FALSE -- Cannot transition from completed
      ELSE FALSE
    END;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Also create the specific TEXT version for compatibility
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_transition(ANYELEMENT, ANYELEMENT, ANYELEMENT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_transition(TEXT, TEXT, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION can_transition(ANYELEMENT, ANYELEMENT, ANYELEMENT) IS 'Validates status transitions with automatic type casting';
COMMENT ON FUNCTION can_transition(TEXT, TEXT, TEXT) IS 'Validates status transitions for tasks and milestones';
