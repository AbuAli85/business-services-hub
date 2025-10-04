-- Realtime Booking Progress Triggers
-- Date: January 2025
-- Description: Add triggers for real-time updates when milestones change

-- Enable replica identity for milestones table
ALTER TABLE public.milestones REPLICA IDENTITY FULL;

-- Create function to notify booking progress updates
CREATE OR REPLACE FUNCTION notify_booking_progress_update()
RETURNS trigger AS $$
BEGIN
  -- Notify when milestone progress changes
  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage) THEN
    PERFORM pg_notify(
      'booking_progress_updates',
      json_build_object(
        'booking_id', NEW.booking_id,
        'milestone_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'old_progress', OLD.progress_percentage,
        'new_progress', NEW.progress_percentage,
        'updated_at', NEW.updated_at
      )::text
    );
  END IF;
  
  -- Notify when new milestone is created
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify(
      'booking_progress_updates',
      json_build_object(
        'booking_id', NEW.booking_id,
        'milestone_id', NEW.id,
        'action', 'created',
        'status', NEW.status,
        'progress', NEW.progress_percentage,
        'created_at', NEW.created_at
      )::text
    );
  END IF;
  
  -- Notify when milestone is deleted
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify(
      'booking_progress_updates',
      json_build_object(
        'booking_id', OLD.booking_id,
        'milestone_id', OLD.id,
        'action', 'deleted',
        'deleted_at', NOW()
      )::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_notify_booking_progress ON public.milestones;

-- Create trigger for milestone updates
CREATE TRIGGER trg_notify_booking_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_progress_update();

-- Also add trigger for tasks table to catch task completion
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION notify_task_progress_update()
RETURNS trigger AS $$
DECLARE
  milestone_record RECORD;
BEGIN
  -- Get the milestone for this task
  SELECT booking_id INTO milestone_record FROM public.milestones WHERE id = NEW.milestone_id;
  
  IF milestone_record.booking_id IS NOT NULL THEN
    -- Notify when task status changes
    IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage) THEN
      PERFORM pg_notify(
        'booking_progress_updates',
        json_build_object(
          'booking_id', milestone_record.booking_id,
          'task_id', NEW.id,
          'milestone_id', NEW.milestone_id,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'old_progress', OLD.progress_percentage,
          'new_progress', NEW.progress_percentage,
          'updated_at', NEW.updated_at
        )::text
      );
    END IF;
    
    -- Notify when new task is created
    IF TG_OP = 'INSERT' THEN
      PERFORM pg_notify(
        'booking_progress_updates',
        json_build_object(
          'booking_id', milestone_record.booking_id,
          'task_id', NEW.id,
          'milestone_id', NEW.milestone_id,
          'action', 'task_created',
          'status', NEW.status,
          'progress', NEW.progress_percentage,
          'created_at', NEW.created_at
        )::text
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_notify_task_progress ON public.tasks;

-- Create trigger for task updates
CREATE TRIGGER trg_notify_task_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_progress_update();

-- Add comment for documentation
COMMENT ON FUNCTION notify_booking_progress_update() IS 'Notifies real-time subscribers when milestone progress changes';
COMMENT ON FUNCTION notify_task_progress_update() IS 'Notifies real-time subscribers when task progress changes';
