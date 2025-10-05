# How to Apply the Booking Progress Fix

## Important: Apply in Sections

The SQL file is large. If you're getting "function does not exist" errors, it means Supabase might be executing in batches. Here's how to apply it safely:

## Option 1: Apply in 3 Separate Steps

### **Step 1: Drop Triggers and Create Functions**
Copy and run this section:

```sql
-- Drop all existing triggers first
DROP TRIGGER IF EXISTS trg_enforce_booking_status_transition ON public.bookings;
DROP TRIGGER IF EXISTS trg_update_booking_progress ON public.milestones;
DROP TRIGGER IF EXISTS trg_update_milestone_progress_on_task_change ON public.tasks;

-- Create Function 1: Audit logging
CREATE OR REPLACE FUNCTION public.enforce_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL AND 
     (OLD.status IS DISTINCT FROM NEW.status OR 
      OLD.progress_percentage IS DISTINCT FROM NEW.progress_percentage) THEN
    BEGIN
      INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id,
        old_values, new_values, created_at
      ) VALUES (
        current_user_id, 'status_change', 'bookings', NEW.id::text,
        jsonb_build_object('status', OLD.status, 'progress_percentage', OLD.progress_percentage),
        jsonb_build_object('status', NEW.status, 'progress_percentage', NEW.progress_percentage),
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create audit log: %', SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- Create Function 2: Booking progress from milestones
CREATE OR REPLACE FUNCTION public.update_booking_progress_on_milestone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_uuid UUID;
  weighted_progress NUMERIC := 0;
  total_weight NUMERIC := 0;
  final_progress INTEGER := 0;
  milestone_record RECORD;
BEGIN
  booking_uuid := COALESCE(NEW.booking_id, OLD.booking_id);
  IF booking_uuid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

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
  SET progress_percentage = final_progress, project_progress = final_progress, updated_at = NOW()
  WHERE id = booking_uuid;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create Function 3: Milestone progress from tasks
CREATE OR REPLACE FUNCTION public.update_milestone_progress_on_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
  IF milestone_uuid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

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
```

### **Step 2: Create Triggers**
Copy and run this section:

```sql
-- Create all triggers
CREATE TRIGGER trg_enforce_booking_status_transition
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_status_transition();

CREATE TRIGGER trg_update_booking_progress
AFTER INSERT OR UPDATE OR DELETE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.update_booking_progress_on_milestone_change();

CREATE TRIGGER trg_update_milestone_progress_on_task_change
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_milestone_progress_on_task_change();
```

### **Step 3: Sync and Recalculate**
Copy and run this section:

```sql
-- Sync existing data
UPDATE public.bookings 
SET progress_percentage = COALESCE(project_progress, 0)
WHERE progress_percentage IS NULL OR progress_percentage != COALESCE(project_progress, 0);

-- Force recalculate all bookings
DO $$
DECLARE booking_rec RECORD;
BEGIN
  FOR booking_rec IN SELECT DISTINCT booking_id FROM public.milestones WHERE booking_id IS NOT NULL
  LOOP
    BEGIN
      PERFORM calculate_booking_progress(booking_rec.booking_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to calculate progress for booking %: %', booking_rec.booking_id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_booking_progress_on_milestone_change() TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress_on_task_change() TO authenticated;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bookings_progress_percentage ON public.bookings(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_bookings_status_progress ON public.bookings(status, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_milestones_booking_progress ON public.milestones(booking_id, progress_percentage, weight);
```

## Option 2: Run Full File (If Editor Supports It)

Some SQL editors execute the entire file as one transaction. If yours does, you can run the whole `fix_booking_progress_display.sql` file at once.

## Expected Result

After successful execution:
- ✅ All 3 functions created
- ✅ All 3 triggers created
- ✅ Existing bookings progress synced
- ✅ All booking progress recalculated
- ✅ Indexes added

## Verification

Run this to verify everything worked:

```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%progress%'
ORDER BY routine_name;

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- Check booking has progress
SELECT id, title, status, progress_percentage, project_progress
FROM bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
```

**Try applying in the 3 separate steps above!** 🎯

