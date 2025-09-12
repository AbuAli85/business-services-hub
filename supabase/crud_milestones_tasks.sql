-- CRUD RPCs for milestones and tasks + permissive RLS for quick enablement

-- Drop existing functions if present (safe)
DROP FUNCTION IF EXISTS add_milestone(uuid, text, text, timestamptz, numeric);
DROP FUNCTION IF EXISTS update_milestone(uuid, text, text, timestamptz, text);
DROP FUNCTION IF EXISTS delete_milestone(uuid);
DROP FUNCTION IF EXISTS add_task(uuid, text, timestamptz);
DROP FUNCTION IF EXISTS update_task(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS delete_task(uuid);

-- Add Milestone
CREATE OR REPLACE FUNCTION add_milestone(
  booking_id uuid,
  title text,
  description text,
  due_date timestamptz,
  weight numeric default 1
) RETURNS uuid AS $$
DECLARE 
  new_id uuid;
BEGIN
  INSERT INTO milestones (
    booking_id, title, description, due_date, weight, status, 
    progress_percentage, editable, created_at, updated_at
  )
  VALUES (
    booking_id, title, description, due_date, weight, 'pending',
    0, true, now(), now()
  )
  RETURNING id INTO new_id;

  PERFORM calculate_booking_progress(booking_id);
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Milestone
CREATE OR REPLACE FUNCTION update_milestone(
  milestone_id uuid,
  title text DEFAULT NULL,
  description text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL,
  status text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_id;

  UPDATE milestones
  SET 
    title = COALESCE(update_milestone.title, milestones.title),
    description = COALESCE(update_milestone.description, milestones.description),
    due_date = COALESCE(update_milestone.due_date, milestones.due_date),
    status = COALESCE(update_milestone.status, milestones.status),
    updated_at = now()
  WHERE id = milestone_id;

  PERFORM update_milestone_progress(milestone_id);
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete Milestone
CREATE OR REPLACE FUNCTION delete_milestone(milestone_id uuid)
RETURNS void AS $$
DECLARE
  booking_uuid uuid;
BEGIN
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_id;
  DELETE FROM milestones WHERE id = milestone_id;
  IF booking_uuid IS NOT NULL THEN
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add Task
CREATE OR REPLACE FUNCTION add_task(
  milestone_id uuid,
  title text,
  due_date timestamptz DEFAULT NULL,
  description text DEFAULT NULL,
  priority text DEFAULT 'normal',
  estimated_hours numeric DEFAULT 0
) RETURNS uuid AS $$
DECLARE 
  new_id uuid;
  booking_uuid uuid;
BEGIN
  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = milestone_id;

  INSERT INTO tasks (
    milestone_id, title, status, due_date, description, priority, estimated_hours,
    editable, created_at, updated_at
  )
  VALUES (
    milestone_id, title, 'pending', due_date, COALESCE(description, ''),
    COALESCE(priority, 'normal'), COALESCE(estimated_hours, 0),
    true, now(), now()
  )
  RETURNING id INTO new_id;

  PERFORM update_milestone_progress(milestone_id);
  PERFORM calculate_booking_progress(booking_uuid);
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backward-compatible wrapper (3-arg signature)
CREATE OR REPLACE FUNCTION add_task(
  milestone_id uuid,
  title text,
  due_date timestamptz
) RETURNS uuid AS $$
DECLARE
  new_id uuid;
BEGIN
  SELECT add_task(milestone_id, title, due_date, NULL, 'medium', 0) INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Task (kept here to ensure presence)
CREATE OR REPLACE FUNCTION update_task(
  task_id uuid,
  title text DEFAULT NULL,
  status text DEFAULT NULL,
  due_date timestamptz DEFAULT NULL
) RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  UPDATE tasks
  SET 
    title = COALESCE(update_task.title, tasks.title),
    status = COALESCE(update_task.status, tasks.status),
    due_date = COALESCE(update_task.due_date, tasks.due_date),
    updated_at = now()
  WHERE id = task_id
  RETURNING milestone_id INTO m_id;

  SELECT booking_id INTO booking_uuid FROM milestones WHERE id = m_id;
  PERFORM update_milestone_progress(m_id);
  PERFORM calculate_booking_progress(booking_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete Task
CREATE OR REPLACE FUNCTION delete_task(task_id uuid)
RETURNS void AS $$
DECLARE
  m_id uuid;
  booking_uuid uuid;
BEGIN
  SELECT milestone_id INTO m_id FROM tasks WHERE id = task_id;
  DELETE FROM tasks WHERE id = task_id;
  IF m_id IS NOT NULL THEN
    SELECT booking_id INTO booking_uuid FROM milestones WHERE id = m_id;
    PERFORM update_milestone_progress(m_id);
    PERFORM calculate_booking_progress(booking_uuid);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION add_milestone(uuid, text, text, timestamptz, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone(uuid, text, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_milestone(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION add_task(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION add_task(uuid, text, timestamptz, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_task(uuid) TO authenticated;

-- Ensure RLS policies are permissive (temporary)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'milestones' AND policyname = 'milestones_all_access'
  ) THEN
    EXECUTE 'CREATE POLICY "milestones_all_access" ON public.milestones FOR ALL USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_all_access'
  ) THEN
    EXECUTE 'CREATE POLICY "tasks_all_access" ON public.tasks FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;


