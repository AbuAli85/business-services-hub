-- Migration #207: Realtime Booking Progress Auto-Update
-- Date: 2025-10-05
-- Purpose: Keep bookings.progress_percentage and v_booking_status in sync automatically

-- 1. Function: recalc booking progress
CREATE OR REPLACE FUNCTION public.update_booking_progress_on_milestone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_milestones     INT;
  completed_milestones INT;
  new_progress         NUMERIC;
  new_status           TEXT;
BEGIN
  -- Count total and completed milestones for this booking
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_milestones, completed_milestones
  FROM public.milestones
  WHERE booking_id = NEW.booking_id;

  -- Calculate progress %
  IF total_milestones > 0 THEN
    new_progress := ROUND((completed_milestones::NUMERIC / total_milestones::NUMERIC) * 100, 0);
  ELSE
    new_progress := 0;
  END IF;

  -- Update booking progress + derived status
  UPDATE public.bookings
  SET
    progress_percentage = new_progress,
    status = CASE
      WHEN new_progress = 100 THEN 'completed'
      WHEN new_progress > 0 THEN 'in_progress'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$$;

-- 2. Trigger: on insert/update/delete of milestones
DROP TRIGGER IF EXISTS trg_update_booking_progress ON public.milestones;
CREATE TRIGGER trg_update_booking_progress
AFTER INSERT OR UPDATE OR DELETE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.update_booking_progress_on_milestone_change();

-- Add comment for documentation
COMMENT ON FUNCTION public.update_booking_progress_on_milestone_change() IS
'Automatically recalculates booking progress percentage and status when milestones change';
