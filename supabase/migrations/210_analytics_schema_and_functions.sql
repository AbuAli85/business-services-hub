-- Migration #210: Analytics Schema and Functions
-- Date: 2025-10-05
-- Purpose: Create time-series analytics functions and views for smart dashboard

-- 1. Create analytics views for time-series data
CREATE OR REPLACE VIEW public.v_booking_trends AS
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

-- 2. Create revenue by status view
CREATE OR REPLACE VIEW public.v_revenue_by_status AS
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

-- 3. Create completion time analytics view
CREATE OR REPLACE VIEW public.v_completion_analytics AS
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  NULL as avg_completion_days, -- Completion time calculation not available without completion timestamp
  ROUND(AVG(progress_percentage)::NUMERIC, 1) as avg_progress,
  COALESCE(SUM(total_amount), 0) as total_revenue
FROM public.bookings
WHERE created_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;

-- 4. Create service performance analytics
CREATE OR REPLACE VIEW public.v_service_performance AS
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
  NULL as avg_completion_days -- Completion time calculation not available without completion timestamp
FROM public.services s
LEFT JOIN public.bookings b ON s.id = b.service_id
WHERE b.created_at >= CURRENT_DATE - INTERVAL '90 days' OR b.created_at IS NULL
GROUP BY s.id, s.title, s.category
HAVING COUNT(b.id) > 0
ORDER BY total_revenue DESC;

-- Grant permissions
GRANT SELECT ON public.v_booking_trends TO authenticated;
GRANT SELECT ON public.v_revenue_by_status TO authenticated;
GRANT SELECT ON public.v_completion_analytics TO authenticated;
GRANT SELECT ON public.v_service_performance TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.v_booking_trends IS 'Daily booking trends with counts, revenue, and progress metrics';
COMMENT ON VIEW public.v_revenue_by_status IS 'Revenue breakdown by booking status with 30-day trends';
COMMENT ON VIEW public.v_completion_analytics IS 'Weekly completion time analytics and progress tracking';
COMMENT ON VIEW public.v_service_performance IS 'Service-level performance metrics and completion rates';
