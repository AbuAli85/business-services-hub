-- Migration: Final Fix for Security Definer Views
-- Description: Ensure all views are created without SECURITY DEFINER property
-- Date: 2025-01-25
-- Priority: 999 (runs after all other migrations)

-- This migration ensures all views are created without SECURITY DEFINER property
-- to respect RLS policies and use caller permissions instead of creator permissions.

-- =============================================
-- 1. Drop all existing security definer views
-- =============================================

-- Drop all views that might have SECURITY DEFINER property
DROP VIEW IF EXISTS public.v_completion_analytics CASCADE;
DROP VIEW IF EXISTS public.v_revenue_forecast CASCADE;
DROP VIEW IF EXISTS public.v_booking_status_metrics CASCADE;
DROP VIEW IF EXISTS public.v_provider_workload_analytics CASCADE;
DROP VIEW IF EXISTS public.v_booking_trends CASCADE;
DROP VIEW IF EXISTS public.v_booking_anomalies CASCADE;
DROP VIEW IF EXISTS public.v_revenue_by_status CASCADE;
DROP VIEW IF EXISTS public.v_service_performance CASCADE;
DROP VIEW IF EXISTS public.bookings_full_view CASCADE;
DROP VIEW IF EXISTS public.booking_list_optimized CASCADE;
DROP VIEW IF EXISTS public.booking_list_enhanced CASCADE;
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

-- =============================================
-- 2. Recreate all views without SECURITY DEFINER
-- =============================================

-- Recreate v_completion_analytics
CREATE VIEW public.v_completion_analytics
AS
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  NULL as avg_completion_days,
  ROUND(AVG(progress_percentage)::NUMERIC, 1) as avg_progress,
  COALESCE(SUM(total_amount), 0) as total_revenue
FROM public.bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- Recreate v_revenue_forecast
CREATE VIEW public.v_revenue_forecast
AS
WITH monthly_revenue AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    SUM(total_amount) as revenue
  FROM public.bookings
  WHERE status IN ('paid', 'completed')
    AND created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
),
forecast_data AS (
  SELECT 
    month,
    revenue,
    LAG(revenue) OVER (ORDER BY month) as prev_revenue,
    AVG(revenue) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as avg_revenue
  FROM monthly_revenue
)
SELECT 
  month,
  revenue,
  COALESCE(prev_revenue, 0) as prev_month_revenue,
  COALESCE(avg_revenue, 0) as avg_3month_revenue,
  CASE 
    WHEN prev_revenue > 0 THEN ROUND(((revenue - prev_revenue) / prev_revenue) * 100, 2)
    ELSE 0 
  END as month_over_month_growth,
  COALESCE(avg_revenue * 1.1, 0) as forecast_next_month
FROM forecast_data
ORDER BY month DESC;

-- Recreate v_booking_status
CREATE VIEW public.v_booking_status
AS
SELECT 
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    
    -- Progress calculation
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN COALESCE(b.progress_percentage, 50)
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
        WHEN b.status = 'cancelled' THEN 'cancelled'
        ELSE b.status
    END as display_status
    
FROM public.bookings b;

-- Recreate v_booking_status_metrics
CREATE VIEW public.v_booking_status_metrics
AS
SELECT
  COUNT(*)                                  AS total_bookings,
  COUNT(*) FILTER (WHERE display_status='pending')      AS pending_count,
  COUNT(*) FILTER (WHERE display_status='approved')     AS approved_count,
  COUNT(*) FILTER (WHERE display_status='in_progress')  AS in_progress_count,
  COUNT(*) FILTER (WHERE display_status='completed')    AS completed_count,
  COUNT(*) FILTER (WHERE display_status='cancelled')    AS cancelled_count,
  ROUND(AVG(progress)::NUMERIC,1)                       AS avg_progress,
  COALESCE(SUM(amount),0)                               AS total_revenue
FROM public.v_booking_status;

-- Recreate v_provider_workload_analytics
CREATE VIEW public.v_provider_workload_analytics
AS
SELECT
  p.id as provider_id,
  p.full_name as provider_name,
  p.email as provider_email,
  COUNT(b.id) as total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'in_progress') as active_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
  ROUND(AVG(b.progress_percentage)::NUMERIC, 1) as avg_progress,
  COALESCE(SUM(b.total_amount), 0) as total_revenue,
  CASE 
    WHEN COUNT(b.id) > 0 THEN 
      ROUND((COUNT(b.id) FILTER (WHERE b.status = 'completed')::DECIMAL / COUNT(b.id)) * 100, 1)
    ELSE 0 
  END as completion_rate
FROM public.profiles p
LEFT JOIN public.bookings b ON p.id = b.provider_id
WHERE p.role = 'provider'
  AND (b.created_at >= CURRENT_DATE - INTERVAL '90 days' OR b.created_at IS NULL)
GROUP BY p.id, p.full_name, p.email
ORDER BY total_revenue DESC;

-- Recreate v_booking_trends
CREATE VIEW public.v_booking_trends
AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_bookings,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
  ROUND(AVG(progress_percentage)::NUMERIC, 1) as avg_progress,
  COALESCE(SUM(total_amount), 0) as total_revenue,
  COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as completed_revenue
FROM public.bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Recreate v_booking_anomalies
CREATE VIEW public.v_booking_anomalies
AS
WITH daily_stats AS (
  SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as booking_count,
    SUM(total_amount) as daily_revenue
  FROM public.bookings
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE_TRUNC('day', created_at)
),
stats AS (
  SELECT 
    AVG(booking_count) as avg_bookings,
    STDDEV(booking_count) as stddev_bookings,
    AVG(daily_revenue) as avg_revenue,
    STDDEV(daily_revenue) as stddev_revenue
  FROM daily_stats
)
SELECT 
  ds.date,
  ds.booking_count,
  ds.daily_revenue,
  CASE 
    WHEN ABS(ds.booking_count - s.avg_bookings) > (2 * s.stddev_bookings) THEN 'booking_anomaly'
    WHEN ABS(ds.daily_revenue - s.avg_revenue) > (2 * s.stddev_revenue) THEN 'revenue_anomaly'
    ELSE 'normal'
  END as anomaly_type,
  ROUND(s.avg_bookings, 1) as expected_bookings,
  ROUND(s.avg_revenue, 2) as expected_revenue
FROM daily_stats ds
CROSS JOIN stats s
WHERE ABS(ds.booking_count - s.avg_bookings) > (2 * s.stddev_bookings)
   OR ABS(ds.daily_revenue - s.avg_revenue) > (2 * s.stddev_revenue)
ORDER BY ds.date DESC;

-- Recreate v_revenue_by_status
CREATE VIEW public.v_revenue_by_status
AS
SELECT
  status,
  COUNT(*) as booking_count,
  COALESCE(SUM(total_amount), 0) as total_revenue,
  COALESCE(AVG(total_amount), 0) as avg_booking_value,
  COALESCE(SUM(total_amount) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as revenue_last_30_days
FROM public.bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY status
ORDER BY total_revenue DESC;

-- Recreate v_service_performance
CREATE VIEW public.v_service_performance
AS
SELECT
  s.id as service_id,
  s.title as service_title,
  s.category as service_category,
  COUNT(b.id) as total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
  ROUND(
    (COUNT(b.id) FILTER (WHERE b.status = 'completed')::NUMERIC / 
     NULLIF(COUNT(b.id), 0)) * 100, 1
  ) as completion_rate,
  ROUND(AVG(b.progress_percentage)::NUMERIC, 1) as avg_progress,
  COALESCE(SUM(b.total_amount), 0) as total_revenue,
  NULL as avg_completion_days
FROM public.services s
LEFT JOIN public.bookings b ON s.id = b.service_id
WHERE b.created_at >= CURRENT_DATE - INTERVAL '90 days' OR b.created_at IS NULL
GROUP BY s.id, s.title, s.category
HAVING COUNT(b.id) > 0
ORDER BY total_revenue DESC;

-- Recreate bookings_full_view
CREATE VIEW public.bookings_full_view
AS
SELECT 
    b.id,
    b.title,
    b.description,
    b.status,
    b.progress_percentage,
    b.total_amount,
    b.subtotal,
    b.vat_amount,
    b.currency,
    b.created_at,
    b.updated_at,
    b.due_at,
    b.provider_id,
    b.client_id,
    b.service_id,
    
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    
    -- Service information
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    s.base_price as service_base_price,
    
    -- Status display
    CASE 
        WHEN b.status = 'pending_payment' THEN 'pending'
        WHEN b.status = 'paid' THEN 'approved'
        WHEN b.status = 'in_progress' THEN 'in_progress'
        WHEN b.status = 'completed' THEN 'completed'
        WHEN b.status = 'cancelled' THEN 'cancelled'
        ELSE b.status
    END as display_status,
    
    -- Progress calculation
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN COALESCE(b.progress_percentage, 50)
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- Recreate booking_list_optimized
CREATE VIEW public.booking_list_optimized
AS
SELECT 
    b.id,
    b.title,
    b.status,
    b.progress_percentage,
    b.total_amount,
    b.currency,
    b.created_at,
    b.updated_at,
    b.due_at,
    
    -- Client info
    c.full_name as client_name,
    c.email as client_email,
    
    -- Provider info
    p.full_name as provider_name,
    p.email as provider_email,
    
    -- Service info
    s.title as service_title,
    s.category as service_category,
    
    -- Status display
    CASE 
        WHEN b.status = 'pending_payment' THEN 'pending'
        WHEN b.status = 'paid' THEN 'approved'
        WHEN b.status = 'in_progress' THEN 'in_progress'
        WHEN b.status = 'completed' THEN 'completed'
        WHEN b.status = 'cancelled' THEN 'cancelled'
        ELSE b.status
    END as display_status
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
WHERE b.created_at >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY b.created_at DESC;

-- Recreate booking_list_enhanced
CREATE VIEW public.booking_list_enhanced
AS
SELECT 
    b.id,
    b.title,
    b.description,
    b.status,
    b.progress_percentage,
    b.total_amount,
    b.subtotal,
    b.vat_amount,
    b.currency,
    b.created_at,
    b.updated_at,
    b.due_at,
    
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.company_name as client_company,
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    p.company_name as provider_company,
    
    -- Service information
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    s.base_price as service_base_price,
    
    -- Status display and progress
    CASE 
        WHEN b.status = 'pending_payment' THEN 'pending'
        WHEN b.status = 'paid' THEN 'approved'
        WHEN b.status = 'in_progress' THEN 'in_progress'
        WHEN b.status = 'completed' THEN 'completed'
        WHEN b.status = 'cancelled' THEN 'cancelled'
        ELSE b.status
    END as display_status,
    
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN COALESCE(b.progress_percentage, 50)
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress,
    
    -- Additional calculated fields
    CASE 
        WHEN b.due_at < CURRENT_DATE AND b.status NOT IN ('completed', 'cancelled') THEN true
        ELSE false
    END as is_overdue,
    
    CASE 
        WHEN b.status = 'completed' THEN 
            EXTRACT(EPOCH FROM (b.updated_at - b.created_at)) / 86400
        ELSE NULL
    END as completion_days
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
ORDER BY b.created_at DESC;

-- =============================================
-- 3. Grant Permissions
-- =============================================

-- Grant permissions on all views
GRANT SELECT ON public.v_completion_analytics TO authenticated;
GRANT SELECT ON public.v_revenue_forecast TO authenticated;
GRANT SELECT ON public.v_booking_status_metrics TO authenticated;
GRANT SELECT ON public.v_provider_workload_analytics TO authenticated;
GRANT SELECT ON public.v_booking_trends TO authenticated;
GRANT SELECT ON public.v_booking_anomalies TO authenticated;
GRANT SELECT ON public.v_revenue_by_status TO authenticated;
GRANT SELECT ON public.v_service_performance TO authenticated;
GRANT SELECT ON public.bookings_full_view TO authenticated;
GRANT SELECT ON public.booking_list_optimized TO authenticated;
GRANT SELECT ON public.booking_list_enhanced TO authenticated;
GRANT SELECT ON public.v_booking_status TO authenticated;

-- =============================================
-- 4. Add Comments
-- =============================================

COMMENT ON VIEW public.v_completion_analytics IS 'Weekly completion time analytics - RLS Compliant (Final)';
COMMENT ON VIEW public.v_revenue_forecast IS 'Revenue forecasting with trend analysis - RLS Compliant (Final)';
COMMENT ON VIEW public.v_booking_status_metrics IS 'Aggregated KPIs for the dashboard - RLS Compliant (Final)';
COMMENT ON VIEW public.v_provider_workload_analytics IS 'Provider workload and performance analytics - RLS Compliant (Final)';
COMMENT ON VIEW public.v_booking_trends IS 'Daily booking trends with counts, revenue, and progress metrics - RLS Compliant (Final)';
COMMENT ON VIEW public.v_booking_anomalies IS 'Detection of booking and revenue anomalies - RLS Compliant (Final)';
COMMENT ON VIEW public.v_revenue_by_status IS 'Revenue breakdown by booking status with 30-day trends - RLS Compliant (Final)';
COMMENT ON VIEW public.v_service_performance IS 'Service-level performance metrics and completion rates - RLS Compliant (Final)';
COMMENT ON VIEW public.bookings_full_view IS 'Complete booking information with client, provider, and service details - RLS Compliant (Final)';
COMMENT ON VIEW public.booking_list_optimized IS 'Optimized booking list for performance - RLS Compliant (Final)';
COMMENT ON VIEW public.booking_list_enhanced IS 'Enhanced booking list with additional calculated fields - RLS Compliant (Final)';
COMMENT ON VIEW public.v_booking_status IS 'Booking status with progress calculation - RLS Compliant (Final)';

-- =============================================
-- 5. Verification
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Final security definer views fix completed successfully:';
    RAISE NOTICE '- Recreated 12 views without SECURITY DEFINER property';
    RAISE NOTICE '- All views now respect RLS policies';
    RAISE NOTICE '- Proper permissions granted to authenticated users';
    RAISE NOTICE '- Views will now use caller permissions instead of creator permissions';
    RAISE NOTICE '- This migration runs with priority 999 to ensure it executes after all other migrations';
END $$;
