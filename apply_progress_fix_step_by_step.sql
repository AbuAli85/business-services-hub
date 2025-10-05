-- ============================================================================
-- STEP 1: DROP ALL EXISTING TRIGGERS (Run this first)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_enforce_booking_status_transition ON public.bookings CASCADE;
DROP TRIGGER IF EXISTS trg_update_booking_progress ON public.milestones CASCADE;
DROP TRIGGER IF EXISTS trg_update_milestone_progress_on_task_change ON public.tasks CASCADE;

-- ============================================================================
-- STEP 2: CREATE FUNCTION 1 - Audit Logging (Run this second)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    BEGIN
      IF OLD.status IS DISTINCT FROM NEW.status OR OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage THEN
        INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values, new_values, created_at)
        VALUES (
          current_user_id,
          'status_change',
          'bookings',
          NEW.id::text,
          jsonb_build_object('status', OLD.status, 'progress_percentage', OLD.progress_percentage),
          jsonb_build_object('status', NEW.status, 'progress_percentage', NEW.progress_percentage),
          NOW()
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Silent fail on audit errors
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 3: CREATE FUNCTION 2 - Booking Progress (Run this third)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_booking_progress_on_milestone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_uuid UUID;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  final_progress INTEGER := 0;
  milestone_record RECORD;
BEGIN
  booking_uuid := COALESCE(NEW.booking_id, OLD.booking_id);
  
  IF booking_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOR milestone_record IN
    SELECT COALESCE(progress_percentage, 0) as progress, COALESCE(weight, 1) as weight
    FROM public.milestones
    WHERE booking_id = booking_uuid AND status NOT IN ('cancelled')
  LOOP
    weighted_progress := weighted_progress + (milestone_record.progress * milestone_record.weight);
    total_weight := total_weight + milestone_record.weight;
  END LOOP;

  IF total_weight > 0 THEN
    final_progress := ROUND(weighted_progress / total_weight);
  ELSE
    final_progress := 0;
  END IF;

  UPDATE public.bookings
  SET
    progress_percentage = final_progress,
    project_progress = final_progress,
    updated_at = NOW()
  WHERE id = booking_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- STEP 4: CREATE FUNCTION 3 - Milestone Progress (Run this fourth)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_milestone_progress_on_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  milestone_uuid UUID;
  total_tasks INTEGER := 0;
  completed_tasks INTEGER := 0;
  in_progress_tasks INTEGER := 0;
  new_progress INTEGER := 0;
  new_status TEXT;
  current_status TEXT;
BEGIN
  milestone_uuid := COALESCE(NEW.milestone_id, OLD.milestone_id);
  
  IF milestone_uuid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO current_status FROM public.milestones WHERE id = milestone_uuid;

  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress')
  INTO total_tasks, completed_tasks, in_progress_tasks
  FROM public.tasks
  WHERE milestone_id = milestone_uuid AND status NOT IN ('cancelled');

  IF total_tasks > 0 THEN
    new_progress := ROUND((completed_tasks::NUMERIC / total_tasks::NUMERIC) * 100);
  ELSE
    new_progress := 0;
  END IF;

  IF new_progress = 100 AND current_status NOT IN ('completed', 'on_hold', 'cancelled') THEN
    new_status := 'completed';
  ELSIF new_progress > 0 AND new_progress < 100 AND current_status = 'pending' THEN
    new_status := 'in_progress';
  ELSIF new_progress = 0 AND current_status = 'in_progress' AND in_progress_tasks = 0 THEN
    new_status := 'pending';
  ELSE
    new_status := current_status;
  END IF;

  UPDATE public.milestones
  SET
    progress_percentage = new_progress,
    total_tasks = total_tasks,
    completed_tasks = completed_tasks,
    status = new_status,
    completed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = milestone_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- STEP 5: CREATE ALL TRIGGERS (Run this fifth - AFTER all functions exist)
-- ============================================================================

CREATE TRIGGER trg_enforce_booking_status_transition
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_status_transition();

CREATE TRIGGER trg_update_booking_progress
AFTER INSERT OR UPDATE OR DELETE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.update_booking_progress_on_milestone_change();

CREATE TRIGGER trg_update_milestone_progress_on_task_change
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_milestone_progress_on_task_change();

-- ============================================================================
-- STEP 6: SYNC AND RECALCULATE (Run this last)
-- ============================================================================

-- Update existing bookings
UPDATE public.bookings 
SET progress_percentage = COALESCE(project_progress, 0)
WHERE progress_percentage IS NULL OR progress_percentage != COALESCE(project_progress, 0);

-- Force recalculate (only if calculate_booking_progress function exists)
DO $$
DECLARE booking_rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_booking_progress') THEN
    FOR booking_rec IN SELECT DISTINCT booking_id FROM public.milestones WHERE booking_id IS NOT NULL
    LOOP
      BEGIN
        PERFORM calculate_booking_progress(booking_rec.booking_id);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Skipped booking %: %', booking_rec.booking_id, SQLERRM;
      END;
    END LOOP;
  END IF;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.enforce_booking_status_transition() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_progress_on_milestone_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_milestone_progress_on_task_change() TO authenticated;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bookings_progress_percentage ON public.bookings(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_bookings_status_progress ON public.bookings(status, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_milestones_booking_progress ON public.milestones(booking_id, progress_percentage, weight);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check functions were created
SELECT 'Functions created:' as info, COUNT(*) as count
FROM pg_catalog.pg_proc 
WHERE proname IN (
  'enforce_booking_status_transition',
  'update_booking_progress_on_milestone_change',
  'update_milestone_progress_on_task_change'
)
AND pronamespace = 'public'::regnamespace;

-- Check triggers were created
SELECT 'Triggers created:' as info, COUNT(*) as count
FROM pg_catalog.pg_trigger 
WHERE tgname IN (
  'trg_enforce_booking_status_transition',
  'trg_update_booking_progress',
  'trg_update_milestone_progress_on_task_change'
)
AND tgrelid::regclass::text LIKE 'public.%';

-- Check booking progress
SELECT 'Booking progress:' as info, id, title, progress_percentage, project_progress
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

