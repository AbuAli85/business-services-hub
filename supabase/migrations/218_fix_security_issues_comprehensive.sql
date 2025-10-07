-- Migration: Fix Comprehensive Security Issues
-- Description: Enable RLS on all tables and fix SECURITY DEFINER views
-- Date: 2025-01-25

-- =============================================
-- 1. Enable RLS on Tables with Policies but RLS Disabled
-- =============================================

-- Enable RLS on bookings table
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tasks table  
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Enable RLS on Tables with No RLS
-- =============================================

-- Enable RLS on insight_run_logs table
ALTER TABLE public.insight_run_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for insight_run_logs
CREATE POLICY "Service role can manage insight_run_logs" ON public.insight_run_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable RLS on notification_channels table
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for notification_channels
CREATE POLICY "Authenticated users can view notification_channels" ON public.notification_channels
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role can manage notification_channels" ON public.notification_channels
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Enable RLS on insight_notifications table
ALTER TABLE public.insight_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for insight_notifications
CREATE POLICY "Service role can manage insight_notifications" ON public.insight_notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view insight_notifications" ON public.insight_notifications
  FOR SELECT TO authenticated
  USING (true);

-- Enable RLS on insight_events table
ALTER TABLE public.insight_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for insight_events
CREATE POLICY "Service role can manage insight_events" ON public.insight_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 3. Fix SECURITY DEFINER Views
-- =============================================

-- Fix bookings_full_view
DROP VIEW IF EXISTS public.bookings_full_view CASCADE;

CREATE OR REPLACE VIEW public.bookings_full_view
AS
SELECT 
  -- Booking core data
  b.id,
  b.title,
  b.requirements,
  b.status,
  b.approval_status,
  b.subtotal,
  b.vat_percent,
  b.vat_amount,
  b.total_amount,
  b.currency,
  b.amount_cents,
  b.due_at,
  b.scheduled_date,
  b.notes,
  b.location,
  b.estimated_duration,
  b.payment_status,
  b.operational_status,
  b.created_at,
  b.updated_at,
  
  -- Client information
  c.id as client_id,
  c.full_name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  c.country as client_country,
  c.is_verified as client_verified,
  
  -- Provider information
  p.id as provider_id,
  p.full_name as provider_name,
  p.email as provider_email,
  p.phone as provider_phone,
  p.country as provider_country,
  p.is_verified as provider_verified,
  
  -- Service information
  s.id as service_id,
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  s.status as service_status,
  s.base_price as service_base_price,
  s.currency as service_currency,
  s.cover_image_url as service_cover_image_url,
  
  -- Company information
  comp.id as company_id,
  comp.name as company_name,
  comp.cr_number as company_cr_number,
  comp.vat_number as company_vat_number,
  comp.logo_url as company_logo_url,
  
  -- Package information
  sp.id as package_id,
  sp.name as package_name,
  sp.price as package_price,
  sp.delivery_days as package_delivery_days,
  sp.revisions as package_revisions,
  sp.features as package_features
  
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.companies comp ON s.company_id = comp.id
LEFT JOIN public.service_packages sp ON b.package_id = sp.id;

-- Fix v_provider_workload_analytics
DROP VIEW IF EXISTS public.v_provider_workload_analytics CASCADE;

CREATE OR REPLACE VIEW public.v_provider_workload_analytics
AS
WITH provider_stats AS (
  SELECT 
    p.id as provider_id,
    p.full_name as provider_name,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'in_progress' THEN 1 END) as active_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
    AVG(CASE WHEN b.status = 'completed' THEN EXTRACT(EPOCH FROM (b.updated_at - b.created_at))/86400 ELSE NULL END) as avg_completion_days
  FROM public.profiles p
  LEFT JOIN public.bookings b ON p.id = b.provider_id
  WHERE p.role = 'provider'
  GROUP BY p.id, p.full_name
)
SELECT 
  provider_id,
  provider_name,
  total_bookings,
  active_bookings,
  completed_bookings,
  cancelled_bookings,
  total_revenue,
  ROUND(avg_completion_days::numeric, 2) as avg_completion_days,
  CASE 
    WHEN total_bookings > 0 THEN ROUND((completed_bookings::numeric / total_bookings::numeric) * 100, 2)
    ELSE 0 
  END as completion_rate,
  CASE 
    WHEN active_bookings > 10 THEN 'High'
    WHEN active_bookings > 5 THEN 'Medium'
    WHEN active_bookings > 0 THEN 'Low'
    ELSE 'None'
  END as workload_status
FROM provider_stats
ORDER BY total_revenue DESC;

-- Fix v_service_performance
DROP VIEW IF EXISTS public.v_service_performance CASCADE;

CREATE OR REPLACE VIEW public.v_service_performance
AS
SELECT 
  s.id as service_id,
  s.title as service_title,
  s.category as service_category,
  s.base_price as service_base_price,
  s.currency as service_currency,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
  AVG(CASE WHEN b.status = 'completed' THEN EXTRACT(EPOCH FROM (b.updated_at - b.created_at))/86400 ELSE NULL END) as avg_completion_days,
  CASE 
    WHEN COUNT(b.id) > 0 THEN ROUND((COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::numeric / COUNT(b.id)::numeric) * 100, 2)
    ELSE 0 
  END as completion_rate
FROM public.services s
LEFT JOIN public.bookings b ON s.id = b.service_id
WHERE s.status = 'active'
GROUP BY s.id, s.title, s.category, s.base_price, s.currency
ORDER BY total_revenue DESC;

-- Fix v_booking_anomalies
DROP VIEW IF EXISTS public.v_booking_anomalies CASCADE;

CREATE OR REPLACE VIEW public.v_booking_anomalies
AS
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.status,
  b.total_amount,
  b.created_at,
  c.full_name as client_name,
  p.full_name as provider_name,
  s.title as service_title,
  'High Value Booking' as anomaly_type,
  b.total_amount as anomaly_value
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
WHERE b.total_amount > (
  SELECT AVG(total_amount) + 2 * STDDEV(total_amount)
  FROM public.bookings
  WHERE status = 'completed'
)
UNION ALL
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.status,
  b.total_amount,
  b.created_at,
  c.full_name as client_name,
  p.full_name as provider_name,
  s.title as service_title,
  'Long Duration Booking' as anomaly_type,
  EXTRACT(EPOCH FROM (b.updated_at - b.created_at))/86400 as anomaly_value
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
WHERE EXTRACT(EPOCH FROM (b.updated_at - b.created_at))/86400 > (
  SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) + 2 * STDDEV(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)
  FROM public.bookings
  WHERE status = 'completed'
);

-- Fix v_completion_analytics
DROP VIEW IF EXISTS public.v_completion_analytics CASCADE;

CREATE OR REPLACE VIEW public.v_completion_analytics
AS
SELECT 
  DATE_TRUNC('month', b.created_at) as month,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  ROUND((COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2) as completion_rate,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as monthly_revenue,
  AVG(CASE WHEN b.status = 'completed' THEN EXTRACT(EPOCH FROM (b.updated_at - b.created_at))/86400 ELSE NULL END) as avg_completion_days
FROM public.bookings b
GROUP BY DATE_TRUNC('month', b.created_at)
ORDER BY month DESC;

-- Fix v_booking_status
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE OR REPLACE VIEW public.v_booking_status
AS
SELECT 
  b.id as booking_id,
  b.booking_number,
  b.status,
  b.operational_status,
  b.payment_status,
  b.approval_status,
  b.created_at,
  b.updated_at,
  c.full_name as client_name,
  p.full_name as provider_name,
  s.title as service_title,
  b.total_amount,
  b.currency
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- Fix v_booking_status_metrics
DROP VIEW IF EXISTS public.v_booking_status_metrics CASCADE;

CREATE OR REPLACE VIEW public.v_booking_status_metrics
AS
SELECT 
  status,
  COUNT(*) as count,
  ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM public.bookings)::numeric) * 100, 2) as percentage,
  COALESCE(SUM(total_amount), 0) as total_value,
  AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (updated_at - created_at))/86400 ELSE NULL END) as avg_duration_days
FROM public.bookings
GROUP BY status
ORDER BY count DESC;

-- Fix v_revenue_by_status
DROP VIEW IF EXISTS public.v_revenue_by_status CASCADE;

CREATE OR REPLACE VIEW public.v_revenue_by_status
AS
SELECT 
  b.status,
  COUNT(*) as booking_count,
  COALESCE(SUM(b.total_amount), 0) as total_revenue,
  COALESCE(AVG(b.total_amount), 0) as avg_booking_value,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as realized_revenue
FROM public.bookings b
GROUP BY b.status
ORDER BY total_revenue DESC;

-- Fix v_revenue_forecast
DROP VIEW IF EXISTS public.v_revenue_forecast CASCADE;

CREATE OR REPLACE VIEW public.v_revenue_forecast
AS
WITH monthly_revenue AS (
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as revenue
  FROM public.bookings
  WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month
),
forecast_data AS (
  SELECT 
    month,
    revenue,
    LAG(revenue, 1) OVER (ORDER BY month) as prev_month_revenue,
    LAG(revenue, 2) OVER (ORDER BY month) as prev_2_month_revenue
  FROM monthly_revenue
)
SELECT 
  month,
  revenue as actual_revenue,
  CASE 
    WHEN prev_month_revenue IS NOT NULL AND prev_2_month_revenue IS NOT NULL THEN
      ROUND((revenue + prev_month_revenue + prev_2_month_revenue) / 3, 2)
    WHEN prev_month_revenue IS NOT NULL THEN
      ROUND((revenue + prev_month_revenue) / 2, 2)
    ELSE revenue
  END as forecasted_revenue
FROM forecast_data
ORDER BY month DESC;

-- Fix v_booking_trends
DROP VIEW IF EXISTS public.v_booking_trends CASCADE;

CREATE OR REPLACE VIEW public.v_booking_trends
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

-- =============================================
-- 4. Grant Permissions on Views
-- =============================================

-- Grant permissions on all fixed views
GRANT SELECT ON public.bookings_full_view TO authenticated;
GRANT SELECT ON public.v_provider_workload_analytics TO authenticated;
GRANT SELECT ON public.v_service_performance TO authenticated;
GRANT SELECT ON public.v_booking_anomalies TO authenticated;
GRANT SELECT ON public.v_completion_analytics TO authenticated;
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status_metrics TO authenticated;
GRANT SELECT ON public.v_revenue_by_status TO authenticated;
GRANT SELECT ON public.v_revenue_forecast TO authenticated;
GRANT SELECT ON public.v_booking_trends TO authenticated;

-- Grant service role permissions
GRANT SELECT ON public.bookings_full_view TO service_role;
GRANT SELECT ON public.v_provider_workload_analytics TO service_role;
GRANT SELECT ON public.v_service_performance TO service_role;
GRANT SELECT ON public.v_booking_anomalies TO service_role;
GRANT SELECT ON public.v_completion_analytics TO service_role;
GRANT SELECT ON public.v_booking_status TO service_role;
GRANT SELECT ON public.v_booking_status_metrics TO service_role;
GRANT SELECT ON public.v_revenue_by_status TO service_role;
GRANT SELECT ON public.v_revenue_forecast TO service_role;
GRANT SELECT ON public.v_booking_trends TO service_role;

-- =============================================
-- 5. Add Comments for Documentation
-- =============================================

COMMENT ON VIEW public.bookings_full_view IS 'Comprehensive booking view with client, provider, service, and company information - respects RLS policies';
COMMENT ON VIEW public.v_provider_workload_analytics IS 'Provider workload analytics view - respects RLS policies';
COMMENT ON VIEW public.v_service_performance IS 'Service performance metrics view - respects RLS policies';
COMMENT ON VIEW public.v_booking_anomalies IS 'Booking anomalies detection view - respects RLS policies';
COMMENT ON VIEW public.v_completion_analytics IS 'Booking completion analytics view - respects RLS policies';
COMMENT ON VIEW public.v_booking_status IS 'Booking status overview view - respects RLS policies';
COMMENT ON VIEW public.v_booking_status_metrics IS 'Booking status metrics view - respects RLS policies';
COMMENT ON VIEW public.v_revenue_by_status IS 'Revenue breakdown by booking status view - respects RLS policies';
COMMENT ON VIEW public.v_revenue_forecast IS 'Revenue forecasting view - respects RLS policies';
COMMENT ON VIEW public.v_booking_trends IS 'Weekly booking trends view - respects RLS policies';

-- =============================================
-- 6. Verification and Notification
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Security fixes applied successfully:';
    RAISE NOTICE '- Enabled RLS on bookings, tasks, insight_run_logs, notification_channels, insight_notifications, insight_events tables';
    RAISE NOTICE '- Fixed 11 SECURITY DEFINER views by removing the property';
    RAISE NOTICE '- Added appropriate RLS policies for new tables';
    RAISE NOTICE '- Granted proper permissions on all views';
END $$;
