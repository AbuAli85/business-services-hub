-- FINAL PROGRESS SYSTEM FIX - CORRECTED VERSION
-- Fix column name inconsistencies between database and frontend
-- Date: January 2025

-- 1. Add progress_percentage column to milestones table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'milestones' 
        AND column_name = 'progress_percentage'
    ) THEN
        ALTER TABLE public.milestones 
        ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
        
        RAISE NOTICE 'Added progress_percentage column to milestones table';
    ELSE
        RAISE NOTICE 'progress_percentage column already exists in milestones table';
    END IF;
END $$;

-- 2. Add progress_percentage column to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'tasks' 
        AND column_name = 'progress_percentage'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
        
        RAISE NOTICE 'Added progress_percentage column to tasks table';
    ELSE
        RAISE NOTICE 'progress_percentage column already exists in tasks table';
    END IF;
END $$;

-- 3. Update existing data to populate progress_percentage from progress column
UPDATE public.milestones 
SET progress_percentage = COALESCE(progress, 0)
WHERE progress_percentage IS NULL OR progress_percentage = 0;

UPDATE public.tasks 
SET progress_percentage = COALESCE(progress, 0)
WHERE progress_percentage IS NULL OR progress_percentage = 0;

-- 4. Create or replace calculate_booking_progress function with correct column names
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_id uuid)
RETURNS INTEGER AS $$
DECLARE
  total_progress INTEGER;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  milestone_record RECORD;
  milestone_count INTEGER := 0;
BEGIN
  -- Calculate weighted progress across all milestones for this booking
  FOR milestone_record IN
    SELECT 
      COALESCE(m.progress_percentage, 0) as progress_percentage,
      COALESCE(m.weight, 1) as weight
    FROM milestones m
    WHERE m.booking_id = calculate_booking_progress.booking_id
  LOOP
    weighted_progress := weighted_progress + (milestone_record.progress_percentage * milestone_record.weight);
    total_weight := total_weight + milestone_record.weight;
    milestone_count := milestone_count + 1;
  END LOOP;
  
  -- Calculate average progress
  IF total_weight > 0 THEN
    total_progress := ROUND(weighted_progress / total_weight);
  ELSE
    total_progress := 0;
  END IF;
  
  -- Return 0 if no milestones exist
  IF milestone_count = 0 THEN
    total_progress := 0;
  END IF;
  
  -- Update the bookings table with the calculated progress
  UPDATE bookings 
  SET 
    progress_percentage = total_progress,
    updated_at = now()
  WHERE id = booking_id;
  
  RETURN total_progress;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create or replace update_milestone_progress function
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
DECLARE
  total_tasks INTEGER;
  completed_tasks INTEGER;
  progress_percentage INTEGER;
  actual_hours NUMERIC := 0;
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
  INTO total_tasks, completed_tasks, actual_hours
  FROM public.tasks t
  WHERE t.milestone_id = milestone_uuid;

  -- Calculate progress percentage
  IF total_tasks > 0 THEN
    progress_percentage := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    progress_percentage := 0;
  END IF;

  -- Determine milestone status
  DECLARE
    new_status TEXT;
  BEGIN
    IF completed_tasks = total_tasks AND total_tasks > 0 THEN
      new_status := 'completed';
    ELSIF completed_tasks > 0 THEN
      new_status := 'in_progress';
    ELSE
      new_status := 'pending';
    END IF;

    -- Update milestone
    UPDATE public.milestones
    SET 
      progress_percentage = progress_percentage,
      status = new_status,
      actual_hours = actual_hours,
      completed_tasks = completed_tasks,
      total_tasks = total_tasks,
      updated_at = now()
    WHERE id = milestone_uuid;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create or replace update_task function
CREATE OR REPLACE FUNCTION update_task(
  task_uuid uuid,
  new_status text,
  new_progress_percentage integer,
  new_actual_hours numeric DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  milestone_id_val uuid;
BEGIN
  -- Get milestone_id for this task
  SELECT milestone_id INTO milestone_id_val
  FROM public.tasks
  WHERE id = task_uuid;

  -- Update task
  UPDATE public.tasks
  SET 
    status = new_status,
    progress_percentage = new_progress_percentage,
    actual_hours = COALESCE(new_actual_hours, actual_hours),
    updated_at = now()
  WHERE id = task_uuid;

  -- Update milestone progress if milestone exists
  IF milestone_id_val IS NOT NULL THEN
    PERFORM update_milestone_progress(milestone_id_val);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create or replace recalc_milestone_progress function
CREATE OR REPLACE FUNCTION recalc_milestone_progress(milestone_uuid uuid)
RETURNS void AS $$
BEGIN
  PERFORM update_milestone_progress(milestone_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create or replace can_transition function for trigger
CREATE OR REPLACE FUNCTION can_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status NOT IN ('in_progress', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'in_progress' THEN
      IF NEW.status NOT IN ('completed', 'on_hold', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'on_hold' THEN
      IF NEW.status NOT IN ('in_progress', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'completed' THEN
      IF NEW.status NOT IN ('in_progress') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
      END IF;
    WHEN 'cancelled' THEN
      IF NEW.status NOT IN ('pending') THEN
        RAISE EXCEPTION 'Invalid transition from % to %', OLD.status, NEW.status;
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid current status: %', OLD.status;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to enforce milestone transitions
DROP TRIGGER IF EXISTS enforce_milestone_transition ON public.milestones;
CREATE TRIGGER enforce_milestone_transition
  BEFORE UPDATE ON public.milestones
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION can_transition();

-- 10. Create trigger to update booking progress when milestone changes
DROP TRIGGER IF EXISTS trg_update_booking_progress ON public.milestones;
CREATE OR REPLACE FUNCTION update_booking_progress_on_milestone_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update booking progress when milestone changes
  PERFORM calculate_booking_progress(NEW.booking_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_booking_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_progress_on_milestone_change();

-- 11. Update v_milestone_progress view to use correct column names
CREATE OR REPLACE VIEW v_milestone_progress AS
SELECT 
    m.id,
    m.booking_id,
    m.title,
    m.description,
    m.status,
    m.priority,
    m.due_date,
    m.weight,
    m.created_at,
    m.updated_at,
    m.created_by,
    m.is_overdue,
    m.overdue_since,
    m.completed_at,
    
    -- Use progress_percentage column
    COALESCE(m.progress_percentage, 0) as progress_percentage,
    
    -- Task counts
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN t.is_overdue = TRUE THEN 1 END) as overdue_tasks,
    
    -- Time tracking
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
    
    -- Status calculation
    CASE 
        WHEN COUNT(t.id) = 0 THEN 'pending'
        WHEN COUNT(CASE WHEN t.status = 'completed' THEN 1 END) = COUNT(t.id) THEN 'completed'
        WHEN COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) > 0 THEN 'in_progress'
        ELSE 'pending'
    END as calculated_status

FROM public.milestones m
LEFT JOIN public.tasks t ON t.milestone_id = m.id
GROUP BY m.id, m.booking_id, m.title, m.description, m.status, m.priority, 
         m.due_date, m.weight, m.created_at, m.updated_at, m.created_by, 
         m.is_overdue, m.overdue_since, m.completed_at, m.progress_percentage;

-- 12. Update v_booking_progress view to use correct column names
CREATE OR REPLACE VIEW v_booking_progress AS
SELECT 
    b.id as booking_id,
    b.title as booking_title,
    b.status as booking_status,
    b.progress_percentage as booking_progress,
    b.created_at,
    b.updated_at,
    
    -- Milestone statistics
    COUNT(DISTINCT m.id) as total_milestones,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') as completed_milestones,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    
    -- Time tracking
    COALESCE(SUM(m.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(m.actual_hours), 0) as total_actual_hours,
    
    -- Overdue tasks
    COUNT(DISTINCT t.id) FILTER (WHERE t.is_overdue = TRUE) as overdue_tasks

FROM public.bookings b
LEFT JOIN public.milestones m ON m.booking_id = b.id
LEFT JOIN public.tasks t ON t.milestone_id = m.id
GROUP BY b.id, b.title, b.status, b.progress_percentage, b.created_at, b.updated_at;

-- 13. Update v_tasks_status view to use correct column names
CREATE OR REPLACE VIEW v_tasks_status AS
SELECT 
    t.id,
    t.milestone_id,
    t.title,
    t.description,
    t.status,
    t.progress_percentage,
    t.due_date,
    t.priority,
    t.estimated_hours,
    t.actual_hours,
    t.created_at,
    t.updated_at,
    t.is_overdue,
    
    -- Milestone information
    m.booking_id,
    m.title as milestone_title,
    m.status as milestone_status,
    m.progress_percentage as milestone_progress
    
FROM public.tasks t
LEFT JOIN public.milestones m ON m.id = t.milestone_id;

-- 14. Grant permissions
GRANT SELECT ON v_milestone_progress TO authenticated;
GRANT SELECT ON v_milestone_progress TO anon;
GRANT SELECT ON v_booking_progress TO authenticated;
GRANT SELECT ON v_booking_progress TO anon;
GRANT SELECT ON v_tasks_status TO authenticated;
GRANT SELECT ON v_tasks_status TO anon;

-- 15. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION recalc_milestone_progress(uuid) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Progress system column consistency fix applied successfully!';
    RAISE NOTICE '✅ All functions, views, and triggers updated to use progress_percentage';
    RAISE NOTICE '✅ Database schema is now consistent with frontend expectations';
END $$;
