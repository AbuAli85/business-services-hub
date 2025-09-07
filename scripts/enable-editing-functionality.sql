-- Enable Task Editing and Adding Functionality
-- This script ensures the frontend can properly edit and add tasks

-- 1. Ensure all necessary columns exist for task editing
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS due_date timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS notes text;

-- 2. Create a function to add new tasks
CREATE OR REPLACE FUNCTION add_task_to_milestone(
  milestone_uuid uuid,
  task_title text,
  task_description text DEFAULT '',
  task_priority text DEFAULT 'medium',
  estimated_hours_val numeric DEFAULT 1.0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_task_id uuid;
  next_order_index integer;
BEGIN
  -- Get the next order index for this milestone
  SELECT COALESCE(MAX(order_index), -1) + 1 
  INTO next_order_index
  FROM public.tasks 
  WHERE milestone_id = milestone_uuid;
  
  -- Insert the new task
  INSERT INTO public.tasks (
    milestone_id, title, description, status, priority, 
    estimated_hours, actual_hours, order_index, created_at, updated_at
  ) VALUES (
    milestone_uuid, task_title, task_description, 'pending', task_priority,
    estimated_hours_val, 0, next_order_index, now(), now()
  ) RETURNING id INTO new_task_id;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_uuid);
  
  RETURN new_task_id;
END;
$$;

-- 3. Create a function to update task status
CREATE OR REPLACE FUNCTION update_task_status(
  task_uuid uuid,
  new_status text,
  user_uuid uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  milestone_uuid_val uuid;
BEGIN
  -- Get the milestone_id for this task
  SELECT milestone_id INTO milestone_uuid_val
  FROM public.tasks 
  WHERE id = task_uuid;
  
  -- Update the task
  UPDATE public.tasks 
  SET 
    status = new_status,
    updated_at = now(),
    updated_by = user_uuid,
    completed_at = CASE WHEN new_status = 'completed' THEN now() ELSE completed_at END
  WHERE id = task_uuid;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_uuid_val);
  
  RETURN true;
END;
$$;

-- 4. Create a function to update task details
CREATE OR REPLACE FUNCTION update_task_details(
  task_uuid uuid,
  task_title text,
  task_description text,
  task_priority text,
  estimated_hours_val numeric,
  user_uuid uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  milestone_uuid_val uuid;
BEGIN
  -- Get the milestone_id for this task
  SELECT milestone_id INTO milestone_uuid_val
  FROM public.tasks 
  WHERE id = task_uuid;
  
  -- Update the task
  UPDATE public.tasks 
  SET 
    title = task_title,
    description = task_description,
    priority = task_priority,
    estimated_hours = estimated_hours_val,
    updated_at = now(),
    updated_by = user_uuid
  WHERE id = task_uuid;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_uuid_val);
  
  RETURN true;
END;
$$;

-- 5. Create a function to log time for a task
CREATE OR REPLACE FUNCTION log_time_for_task(
  task_uuid uuid,
  duration_hours_val numeric,
  description_val text,
  user_uuid uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_time_entry_id uuid;
  milestone_uuid_val uuid;
  booking_uuid_val uuid;
BEGIN
  -- Get milestone and booking IDs
  SELECT t.milestone_id, m.booking_id 
  INTO milestone_uuid_val, booking_uuid_val
  FROM public.tasks t
  JOIN public.milestones m ON t.milestone_id = m.id
  WHERE t.id = task_uuid;
  
  -- Insert time entry
  INSERT INTO public.time_entries (
    booking_id, milestone_id, task_id, user_id, 
    duration_hours, description, start_time, logged_at, created_at
  ) VALUES (
    booking_uuid_val, milestone_uuid_val, task_uuid, user_uuid,
    duration_hours_val, description_val, now() - (duration_hours_val || ' hours')::interval, now(), now()
  ) RETURNING id INTO new_time_entry_id;
  
  -- Update task actual_hours
  UPDATE public.tasks 
  SET actual_hours = (
    SELECT COALESCE(SUM(duration_hours), 0)
    FROM public.time_entries 
    WHERE task_id = task_uuid
  )
  WHERE id = task_uuid;
  
  -- Update milestone progress
  PERFORM update_milestone_progress(milestone_uuid_val);
  
  RETURN new_time_entry_id;
END;
$$;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION add_task_to_milestone(uuid, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_status(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_details(uuid, text, text, text, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION log_time_for_task(uuid, numeric, text, uuid) TO authenticated;

-- 7. Test the functionality with a sample task
SELECT 
  '🧪 TESTING EDITING FUNCTIONALITY:' as info,
  add_task_to_milestone(
    (SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5' AND order_index = 0),
    'Test Task - Editable',
    'This task can be edited and managed',
    'high',
    2.0
  ) as new_task_id;

-- 8. Show current task count
SELECT 
  '📊 CURRENT TASK COUNT:' as info,
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks
FROM public.tasks 
WHERE milestone_id IN (
  SELECT id FROM public.milestones WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5'
);

-- 9. Show available functions for frontend
SELECT 
  '🔧 AVAILABLE FUNCTIONS FOR FRONTEND:' as info,
  'add_task_to_milestone(milestone_id, title, description, priority, estimated_hours)' as add_task,
  'update_task_status(task_id, status, user_id)' as update_status,
  'update_task_details(task_id, title, description, priority, estimated_hours, user_id)' as update_details,
  'log_time_for_task(task_id, duration_hours, description, user_id)' as log_time;
