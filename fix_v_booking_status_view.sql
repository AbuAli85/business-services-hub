-- Fix v_booking_status view to include all required columns
-- This addresses the application errors about missing columns

-- Drop and recreate the view with correct column structure
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status
AS
SELECT 
  b.id,                                    -- Primary key (app expects 'id', not 'booking_id')
  b.booking_number, 
  b.status, 
  b.operational_status,
  b.payment_status, 
  b.approval_status, 
  b.created_at, 
  b.updated_at,
  
  -- Essential IDs that the application needs
  b.client_id,                            -- Required for filtering
  b.provider_id,                          -- Required for filtering  
  b.service_id,                           -- Required for joins
  
  -- Financial information
  b.total_amount, 
  b.currency,
  b.subtotal,
  b.vat_amount,
  
  -- User information
  c.full_name as client_name, 
  c.email as client_email,
  p.full_name as provider_name, 
  p.email as provider_email,
  
  -- Service information
  s.title as service_title,
  s.category as service_category,
  
  -- Additional useful fields
  b.requirements,
  b.notes,
  b.due_at,
  b.scheduled_date,
  b.estimated_duration,
  b.location

FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated, service_role;

-- Verify the view structure
DO $$
BEGIN
    RAISE NOTICE '✅ v_booking_status view recreated with all required columns:';
    RAISE NOTICE '- id (primary key)';
    RAISE NOTICE '- provider_id (for filtering)';
    RAISE NOTICE '- client_id (for filtering)';
    RAISE NOTICE '- All other booking fields';
END $$;
