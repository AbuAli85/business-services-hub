-- Fix progress column references in views
-- The issue is that views are referencing b.progress_percentage but the actual column is b.project_progress

-- Drop and recreate v_booking_status view with correct column reference
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status
AS
SELECT 
    b.id as id,
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    
    -- Progress calculation - FIXED: use project_progress instead of progress_percentage
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
    
    -- Additional fields for compatibility (only include existing columns)
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
    b.approval_status,
    
    -- Add computed fields for export compatibility
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

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO anon;

-- Add comment
COMMENT ON VIEW public.v_booking_status IS 'Booking status with progress calculation - FIXED column references';

-- Fix other views that reference progress_percentage incorrectly
-- Drop and recreate views that have incorrect column references

-- Fix v_completion_analytics
DROP VIEW IF EXISTS public.v_completion_analytics CASCADE;
CREATE VIEW public.v_completion_analytics
AS
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  ROUND(AVG(project_progress)::NUMERIC, 1) as avg_progress, -- FIXED: use project_progress
  COALESCE(SUM(total_amount), 0) as total_revenue
FROM public.bookings
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- Fix v_booking_status_metrics
DROP VIEW IF EXISTS public.v_booking_status_metrics CASCADE;
CREATE VIEW public.v_booking_status_metrics
AS
SELECT
  COUNT(*)                                  AS total_bookings,
  COUNT(*) FILTER (WHERE status='pending')      AS pending_count,
  COUNT(*) FILTER (WHERE status='approved')     AS approved_count,
  COUNT(*) FILTER (WHERE status='in_progress')  AS in_progress_count,
  COUNT(*) FILTER (WHERE status='completed')    AS completed_count,
  COUNT(*) FILTER (WHERE status='cancelled')    AS cancelled_count,
  ROUND(AVG(project_progress)::NUMERIC,1)      AS avg_progress, -- FIXED: use project_progress
  COALESCE(SUM(total_amount),0)                AS total_revenue
FROM public.bookings;

-- Grant permissions
GRANT SELECT ON public.v_completion_analytics TO authenticated;
GRANT SELECT ON public.v_booking_status_metrics TO authenticated;

-- Add comments
COMMENT ON VIEW public.v_completion_analytics IS 'Weekly completion analytics - FIXED column references';
COMMENT ON VIEW public.v_booking_status_metrics IS 'Booking status metrics - FIXED column references';
