-- Fix v_booking_status view to include service_description column
-- This resolves the error: "column v_booking_status.service_description does not exist"

-- Drop and recreate v_booking_status view with service_description
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

-- Create the v_booking_status view with service_description
CREATE VIEW public.v_booking_status
WITH (security_invoker = true)
AS
SELECT 
    b.id as id,
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    
    -- Progress calculation - use project_progress
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN COALESCE(b.project_progress, 50)
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress,
    
    -- Amount
    COALESCE(b.total_amount, 0) as amount,
    
    -- Display status
    CASE 
        WHEN b.status = 'pending_payment' THEN 'pending'
        WHEN b.status = 'paid' THEN 'approved'
        WHEN b.status = 'in_progress' THEN 'in_progress'
        WHEN b.status = 'completed' THEN 'completed'
        WHEN b.status = 'delivered' THEN 'completed'
        WHEN b.status = 'cancelled' THEN 'cancelled'
        ELSE b.status
    END as display_status,
    
    -- Additional fields for compatibility
    b.client_id,
    b.provider_id,
    b.service_id,
    b.scheduled_date,
    b.due_at,
    b.requirements,
    b.package_id,
    b.subtotal,
    b.vat_percent,
    b.vat_amount,
    b.total_amount,  -- Add this for compatibility
    b.currency,
    
    -- Add aliases for API compatibility
    b.created_at as created_at,
    b.updated_at as updated_at,
    
    -- Add service and profile information for export
    s.title as service_title,
    s.description as service_description,  -- ADD THIS MISSING COLUMN
    s.category as service_category,
    c.full_name as client_name,
    c.email as client_email,
    p.full_name as provider_name,
    p.email as provider_email
    
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id;

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO service_role;
GRANT SELECT ON public.v_booking_status TO anon;

-- Add comment
COMMENT ON VIEW public.v_booking_status IS 'Booking status with progress calculation and service_description - FIXED';

-- Test the view
SELECT '✅ v_booking_status view fixed with service_description column!' as status;
SELECT COUNT(*) as total_bookings FROM public.v_booking_status;
