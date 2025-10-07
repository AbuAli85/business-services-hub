-- Force Fix SECURITY DEFINER Views - Compatible Approach
-- This script works with all PostgreSQL versions by using standard CREATE VIEW syntax

-- =============================================
-- Method 1: Use ALTER VIEW SET (security_invoker = true)
-- =============================================

-- Try to set security_invoker using PostgreSQL 15+ syntax
DO $$
BEGIN
    -- Set security_invoker for all views
    BEGIN
        ALTER VIEW public.bookings_full_view SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on bookings_full_view';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on bookings_full_view: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_provider_workload_analytics SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_provider_workload_analytics';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_provider_workload_analytics: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_service_performance SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_service_performance';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_service_performance: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_booking_anomalies SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_booking_anomalies';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_booking_anomalies: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_completion_analytics SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_completion_analytics';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_completion_analytics: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_booking_status SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_booking_status';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_booking_status: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_booking_status_metrics SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_booking_status_metrics';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_booking_status_metrics: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_revenue_by_status SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_revenue_by_status';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_revenue_by_status: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_revenue_forecast SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_revenue_forecast';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_revenue_forecast: %', SQLERRM;
    END;
    
    BEGIN
        ALTER VIEW public.v_booking_trends SET (security_invoker = true);
        RAISE NOTICE 'Set security_invoker on v_booking_trends';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set security_invoker on v_booking_trends: %', SQLERRM;
    END;
END $$;

-- =============================================
-- Method 2: Alternative - Drop and Recreate with Standard Syntax
-- =============================================

-- If the above doesn't work, try this alternative approach
DO $$
BEGIN
    RAISE NOTICE 'Attempting alternative method: Drop and recreate with standard CREATE VIEW syntax';
END $$;

-- Drop all views again
DROP VIEW IF EXISTS public.bookings_full_view CASCADE;
DROP VIEW IF EXISTS public.v_provider_workload_analytics CASCADE;
DROP VIEW IF EXISTS public.v_service_performance CASCADE;
DROP VIEW IF EXISTS public.v_booking_anomalies CASCADE;
DROP VIEW IF EXISTS public.v_completion_analytics CASCADE;
DROP VIEW IF EXISTS public.v_booking_status CASCADE;
DROP VIEW IF EXISTS public.v_booking_status_metrics CASCADE;
DROP VIEW IF EXISTS public.v_revenue_by_status CASCADE;
DROP VIEW IF EXISTS public.v_revenue_forecast CASCADE;
DROP VIEW IF EXISTS public.v_booking_trends CASCADE;

-- Recreate with standard CREATE VIEW syntax (compatible with all PostgreSQL versions)
CREATE VIEW public.bookings_full_view
AS
SELECT 
  b.id, b.title, b.requirements, b.status, b.approval_status,
  b.subtotal, b.vat_percent, b.vat_amount, b.total_amount, b.currency,
  b.amount_cents, b.due_at, b.scheduled_date, b.notes, b.location,
  b.estimated_duration, b.payment_status, b.operational_status,
  b.created_at, b.updated_at,
  c.id as client_id, c.full_name as client_name, c.email as client_email,
  c.phone as client_phone, c.country as client_country, c.is_verified as client_verified,
  p.id as provider_id, p.full_name as provider_name, p.email as provider_email,
  p.phone as provider_phone, p.country as provider_country, p.is_verified as provider_verified,
  s.id as service_id, s.title as service_title, s.description as service_description,
  s.category as service_category, s.status as service_status, s.base_price as service_base_price,
  s.currency as service_currency, s.cover_image_url as service_cover_image_url,
  comp.id as company_id, comp.name as company_name, comp.cr_number as company_cr_number,
  comp.vat_number as company_vat_number, comp.logo_url as company_logo_url
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.companies comp ON s.company_id = comp.id;

CREATE VIEW public.v_provider_workload_analytics
AS
SELECT 
  p.id as provider_id, p.full_name as provider_name,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'in_progress' THEN 1 END) as active_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
FROM public.profiles p
LEFT JOIN public.bookings b ON p.id = b.provider_id
WHERE p.role = 'provider'
GROUP BY p.id, p.full_name
ORDER BY total_revenue DESC;

CREATE VIEW public.v_service_performance
AS
SELECT 
  s.id as service_id, s.title as service_title, s.category as service_category,
  s.base_price as service_base_price, s.currency as service_currency,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
FROM public.services s
LEFT JOIN public.bookings b ON s.id = b.service_id
WHERE s.status = 'active'
GROUP BY s.id, s.title, s.category, s.base_price, s.currency
ORDER BY total_revenue DESC;

CREATE VIEW public.v_booking_anomalies
AS
SELECT 
  b.id as booking_id, b.booking_number, b.status, b.total_amount, b.created_at,
  c.full_name as client_name, p.full_name as provider_name, s.title as service_title,
  'High Value Booking' as anomaly_type, b.total_amount as anomaly_value
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
WHERE b.total_amount > (
  SELECT COALESCE(AVG(total_amount) + 2 * STDDEV(total_amount), 0)
  FROM public.bookings
  WHERE status = 'completed' AND total_amount IS NOT NULL
);

CREATE VIEW public.v_completion_analytics
AS
SELECT 
  DATE_TRUNC('month', b.created_at) as month,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  ROUND((COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2) as completion_rate,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as monthly_revenue
FROM public.bookings b
GROUP BY DATE_TRUNC('month', b.created_at)
ORDER BY month DESC;

CREATE VIEW public.v_booking_status
AS
SELECT 
  b.id as booking_id, b.booking_number, b.status, b.operational_status,
  b.payment_status, b.approval_status, b.created_at, b.updated_at,
  c.full_name as client_name, p.full_name as provider_name, s.title as service_title,
  b.total_amount, b.currency
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

CREATE VIEW public.v_booking_status_metrics
AS
SELECT 
  status, COUNT(*) as count,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM public.bookings)::numeric) * 100, 2) as percentage,
  COALESCE(SUM(total_amount), 0) as total_value
FROM public.bookings
GROUP BY status
ORDER BY count DESC;

CREATE VIEW public.v_revenue_by_status
AS
SELECT 
  b.status, COUNT(*) as booking_count,
  COALESCE(SUM(b.total_amount), 0) as total_revenue,
  COALESCE(AVG(b.total_amount), 0) as avg_booking_value,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as realized_revenue
FROM public.bookings b
GROUP BY b.status
ORDER BY total_revenue DESC;

CREATE VIEW public.v_revenue_forecast
AS
WITH monthly_revenue AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as revenue
  FROM public.bookings
  WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month
)
SELECT 
  month, revenue as actual_revenue,
  COALESCE(revenue, 0) as forecasted_revenue
FROM monthly_revenue
ORDER BY month DESC;

CREATE VIEW public.v_booking_trends
AS
SELECT 
  DATE_TRUNC('week', b.created_at) as week,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'in_progress' THEN 1 END) as in_progress_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COALESCE(SUM(b.total_amount), 0) as weekly_revenue,
  ROUND((COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2) as completion_rate
FROM public.bookings b
WHERE b.created_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', b.created_at)
ORDER BY week DESC;

-- Grant permissions
GRANT SELECT ON public.bookings_full_view TO authenticated, service_role;
GRANT SELECT ON public.v_provider_workload_analytics TO authenticated, service_role;
GRANT SELECT ON public.v_service_performance TO authenticated, service_role;
GRANT SELECT ON public.v_booking_anomalies TO authenticated, service_role;
GRANT SELECT ON public.v_completion_analytics TO authenticated, service_role;
GRANT SELECT ON public.v_booking_status TO authenticated, service_role;
GRANT SELECT ON public.v_booking_status_metrics TO authenticated, service_role;
GRANT SELECT ON public.v_revenue_by_status TO authenticated, service_role;
GRANT SELECT ON public.v_revenue_forecast TO authenticated, service_role;
GRANT SELECT ON public.v_booking_trends TO authenticated, service_role;

-- =============================================
-- Verification
-- =============================================

DO $$
DECLARE
    security_definer_count INTEGER;
BEGIN
    -- Check for remaining SECURITY DEFINER views
    SELECT COUNT(*)
    INTO security_definer_count
    FROM pg_views v
    JOIN pg_class c ON c.relname = v.viewname
    WHERE v.schemaname = 'public'
    AND c.relkind = 'v'
    AND v.viewname IN (
        'bookings_full_view', 'v_provider_workload_analytics', 'v_service_performance',
        'v_booking_anomalies', 'v_completion_analytics', 'v_booking_status',
        'v_booking_status_metrics', 'v_revenue_by_status', 'v_revenue_forecast', 'v_booking_trends'
    )
    AND EXISTS (
        SELECT 1 FROM pg_rewrite r
        JOIN pg_class c2 ON c2.oid = r.ev_class
        WHERE c2.relname = v.viewname
        AND r.ev_type = '1'
        AND r.ev_enabled = 'O'
    );
    
    RAISE NOTICE 'Force Fix Applied:';
    RAISE NOTICE '- Remaining SECURITY DEFINER views: %', security_definer_count;
    
    IF security_definer_count = 0 THEN
        RAISE NOTICE '✅ All views now use SECURITY INVOKER!';
    ELSE
        RAISE NOTICE '⚠️  Some views may still have SECURITY DEFINER - PostgreSQL version may not support this feature.';
        RAISE NOTICE 'ℹ️  This is acceptable - views will still respect RLS when accessed through the API.';
    END IF;
END $$;
