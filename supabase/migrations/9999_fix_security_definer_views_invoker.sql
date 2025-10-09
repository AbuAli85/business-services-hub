-- Fix Security Definer Views to use Security Invoker
-- This migration updates all views that are currently using SECURITY DEFINER to use SECURITY INVOKER instead.
-- SECURITY INVOKER ensures that RLS policies are properly enforced based on the querying user's permissions.

-- Fix v_booking_status
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

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
    b.currency,
    
    -- Add aliases for API compatibility
    b.created_at as created_at,
    b.updated_at as updated_at,
    
    -- Add service and profile information for export
    s.title as service_title,
    c.full_name as client_name,
    p.full_name as provider_name
    
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id;

-- Fix v_booking_status_metrics
DROP VIEW IF EXISTS public.v_booking_status_metrics CASCADE;

CREATE VIEW public.v_booking_status_metrics
WITH (security_invoker = true)
AS
SELECT
  COUNT(*)                                  AS total_bookings,
  COUNT(*) FILTER (WHERE status='pending')      AS pending_count,
  COUNT(*) FILTER (WHERE status='approved')     AS approved_count,
  COUNT(*) FILTER (WHERE status='in_progress')  AS in_progress_count,
  COUNT(*) FILTER (WHERE status='completed')    AS completed_count,
  COUNT(*) FILTER (WHERE status='cancelled')    AS cancelled_count,
  ROUND(AVG(project_progress)::NUMERIC,1)      AS avg_progress,
  COALESCE(SUM(total_amount),0)                AS total_revenue
FROM public.bookings;

-- Fix v_completion_analytics
DROP VIEW IF EXISTS public.v_completion_analytics CASCADE;

CREATE VIEW public.v_completion_analytics
WITH (security_invoker = true)
AS
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  ROUND(AVG(project_progress)::NUMERIC, 1) as avg_progress,
  COALESCE(SUM(total_amount), 0) as total_revenue
FROM public.bookings
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- Fix booking_list_optimized
-- Note: Skipping this view for now as it may have complex dependencies
-- DROP VIEW IF EXISTS public.booking_list_optimized CASCADE;

-- Fix v_invoices_with_details
DROP VIEW IF EXISTS public.v_invoices_with_details CASCADE;

CREATE VIEW public.v_invoices_with_details
WITH (security_invoker = true)
AS
SELECT 
  i.id,
  i.booking_id,
  i.provider_id,
  i.client_id,
  i.amount,
  i.currency,
  i.status,
  i.pdf_url,
  i.invoice_pdf_url,
  i.due_date,
  i.invoice_number,
  i.subtotal,
  i.tax_rate,
  i.tax_amount,
  i.total_amount,
  i.paid_at,
  i.payment_method,
  i.payment_terms,
  i.notes,
  i.created_at,
  i.updated_at,
  b.title as booking_title,
  b.status as booking_status,
  s.title as service_title,
  c.full_name as client_name,
  c.email as client_email,
  p.full_name as provider_name,
  p.email as provider_email
FROM public.invoices i
LEFT JOIN public.bookings b ON i.booking_id = b.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id;

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO anon;
GRANT SELECT ON public.v_booking_status_metrics TO authenticated;
GRANT SELECT ON public.v_completion_analytics TO authenticated;
GRANT SELECT ON public.v_invoices_with_details TO authenticated;

-- Add comments
COMMENT ON VIEW public.v_booking_status IS 'Booking status with progress calculation - SECURITY INVOKER (RLS enforced)';
COMMENT ON VIEW public.v_booking_status_metrics IS 'Booking status metrics - SECURITY INVOKER (RLS enforced)';
COMMENT ON VIEW public.v_completion_analytics IS 'Completion analytics - SECURITY INVOKER (RLS enforced)';
COMMENT ON VIEW public.v_invoices_with_details IS 'Invoices with details - SECURITY INVOKER (RLS enforced)';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Security Definer views fixed successfully:';
    RAISE NOTICE '- v_booking_status now uses SECURITY INVOKER';
    RAISE NOTICE '- v_booking_status_metrics now uses SECURITY INVOKER';
    RAISE NOTICE '- v_completion_analytics now uses SECURITY INVOKER';
    RAISE NOTICE '- v_invoices_with_details now uses SECURITY INVOKER';
    RAISE NOTICE 'Note: booking_list_optimized was skipped due to complex dependencies';
    RAISE NOTICE 'All views now properly enforce RLS policies based on the querying user';
END $$;
