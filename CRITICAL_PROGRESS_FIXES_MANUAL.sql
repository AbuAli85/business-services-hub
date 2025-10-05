-- CRITICAL PROGRESS SYSTEM FIXES
-- Run this script manually in your Supabase SQL Editor
-- This will fix the progress tracking system

-- 1. Add missing progress_percentage column to bookings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings' 
        AND column_name = 'progress_percentage'
    ) THEN
        ALTER TABLE public.bookings 
        ADD COLUMN progress_percentage INTEGER DEFAULT 0 
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
        
        -- Update existing data from project_progress if it exists
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'bookings' 
            AND column_name = 'project_progress'
        ) THEN
            UPDATE public.bookings 
            SET progress_percentage = COALESCE(project_progress, 0);
        END IF;
        
        RAISE NOTICE 'Added progress_percentage column to bookings table';
    ELSE
        RAISE NOTICE 'progress_percentage column already exists in bookings table';
    END IF;
END $$;

-- 2. Create the real-time progress update function
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
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id);

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
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Create the trigger for automatic progress updates
DROP TRIGGER IF EXISTS trg_update_booking_progress ON public.milestones;
CREATE TRIGGER trg_update_booking_progress
AFTER INSERT OR UPDATE OR DELETE ON public.milestones
FOR EACH ROW EXECUTE FUNCTION public.update_booking_progress_on_milestone_change();

-- 4. Create the bookings_full_view for backward compatibility
CREATE OR REPLACE VIEW bookings_full_view AS
SELECT 
  -- Booking core data
  b.id,
  b.title,
  b.requirements,
  b.status,
  b.created_at,
  b.updated_at,
  b.due_at,
  b.subtotal,
  b.vat_percent,
  b.vat_amount,
  b.total_amount,
  b.currency,
  b.client_id,
  b.provider_id,
  b.service_id,
  b.package_id,
  b.progress_percentage,
  
  -- Service information
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  s.base_price as service_base_price,
  s.status as service_status,
  
  -- Client profile information
  cp.id as client_profile_id,
  cp.full_name as client_name,
  cp.email as client_email,
  cp.phone as client_phone,
  cp.company_name as client_company,
  cp.avatar_url as client_avatar,
  
  -- Provider profile information
  pp.id as provider_profile_id,
  pp.full_name as provider_name,
  pp.email as provider_email,
  pp.phone as provider_phone,
  pp.company_name as provider_company,
  pp.avatar_url as provider_avatar,
  
  -- Invoice information (latest invoice)
  i.id as invoice_id,
  i.status as invoice_status,
  i.amount as invoice_amount,
  i.currency as invoice_currency,
  i.invoice_number,
  i.due_date as invoice_due_date,
  i.paid_at,
  i.created_at as invoice_created_at,
  
  -- Milestone statistics
  COALESCE(ms.total_milestones, 0) as total_milestones,
  COALESCE(ms.completed_milestones, 0) as completed_milestones,
  COALESCE(ms.total_tasks, 0) as total_tasks,
  COALESCE(ms.completed_tasks, 0) as completed_tasks,
  
  -- Calculated progress percentage
  CASE 
    WHEN COALESCE(ms.total_milestones, 0) > 0 
    THEN ROUND((COALESCE(ms.completed_milestones, 0)::numeric / ms.total_milestones::numeric) * 100)
    ELSE COALESCE(b.progress_percentage, 0)
  END as calculated_progress_percentage,
  
  -- Payment status derivation
  CASE 
    WHEN i.status = 'paid' THEN 'paid'
    WHEN i.status = 'issued' THEN 'pending'
    WHEN i.id IS NOT NULL THEN 'invoiced'
    ELSE 'no_invoice'
  END as payment_status,
  
  -- Status normalization
  CASE 
    WHEN b.status IS NOT NULL THEN b.status
    ELSE 'pending'
  END as normalized_status

FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN profiles cp ON b.client_id = cp.id
LEFT JOIN profiles pp ON b.provider_id = pp.id
LEFT JOIN LATERAL (
  -- Get the latest invoice for this booking
  SELECT * FROM invoices 
  WHERE booking_id = b.id 
  ORDER BY created_at DESC 
  LIMIT 1
) i ON true
LEFT JOIN LATERAL (
  -- Get milestone statistics for this booking
  SELECT 
    COUNT(DISTINCT m.id) as total_milestones,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') as completed_milestones,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    COUNT(DISTINCT t.id) as total_tasks
  FROM milestones m
  LEFT JOIN tasks t ON t.milestone_id = m.id
  WHERE m.booking_id = b.id
) ms ON true;

-- 5. Grant permissions
GRANT SELECT ON bookings_full_view TO authenticated;
GRANT SELECT ON bookings_full_view TO anon;

-- 6. Create progress calculation function
CREATE OR REPLACE FUNCTION public.calculate_booking_progress(booking_id uuid)
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
      COALESCE(milestones.progress, 0) as progress,
      COALESCE(milestones.weight, 1) as weight
    FROM milestones
    WHERE milestones.booking_id = calculate_booking_progress.booking_id
  LOOP
    weighted_progress := weighted_progress + (milestone_record.progress * milestone_record.weight);
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

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_progress_on_milestone_change() TO authenticated;

-- 8. Add comments for documentation
COMMENT ON FUNCTION public.update_booking_progress_on_milestone_change() IS
'Automatically recalculates booking progress percentage and status when milestones change';

COMMENT ON VIEW public.bookings_full_view IS
'Comprehensive view of bookings with all related data for backward compatibility';

COMMENT ON FUNCTION public.calculate_booking_progress(uuid) IS 
'Calculates weighted progress across all milestones for a booking and updates the bookings table';

-- 9. Success message
DO $$
BEGIN
    RAISE NOTICE 'Critical progress system fixes applied successfully!';
    RAISE NOTICE 'Progress tracking should now work properly.';
END $$;
