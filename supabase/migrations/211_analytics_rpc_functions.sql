-- Migration #211: Analytics RPC Functions
-- Date: 2025-10-05
-- Purpose: Create RPC functions for advanced analytics and time-series data

-- 1. Get booking trends with flexible date ranges
CREATE OR REPLACE FUNCTION public.get_booking_trends(
  days_back INTEGER DEFAULT 30,
  group_by TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_bookings BIGINT,
  completed_bookings BIGINT,
  in_progress_bookings BIGINT,
  pending_bookings BIGINT,
  cancelled_bookings BIGINT,
  avg_progress NUMERIC,
  total_revenue NUMERIC,
  completed_revenue NUMERIC,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  date_trunc_func TEXT;
BEGIN
  -- Validate group_by parameter
  IF group_by NOT IN ('day', 'week', 'month') THEN
    RAISE EXCEPTION 'group_by must be one of: day, week, month';
  END IF;
  
  -- Set the appropriate date truncation function
  date_trunc_func := 'DATE_TRUNC(''' || group_by || ''', created_at)';
  
  RETURN QUERY EXECUTE format('
    SELECT 
      %s as period_start,
      %s + INTERVAL ''1 %s'' as period_end,
      COUNT(*) as total_bookings,
      COUNT(*) FILTER (WHERE status = ''completed'') as completed_bookings,
      COUNT(*) FILTER (WHERE status = ''in_progress'') as in_progress_bookings,
      COUNT(*) FILTER (WHERE status = ''pending'') as pending_bookings,
      COUNT(*) FILTER (WHERE status = ''cancelled'') as cancelled_bookings,
      ROUND(AVG(progress_percentage)::NUMERIC, 1) as avg_progress,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(SUM(total_amount) FILTER (WHERE status = ''completed''), 0) as completed_revenue,
      ROUND(
        (COUNT(*) FILTER (WHERE status = ''completed'')::NUMERIC / 
         NULLIF(COUNT(*), 0)) * 100, 1
      ) as completion_rate
    FROM public.bookings
    WHERE created_at >= CURRENT_DATE - INTERVAL ''%s days''
    GROUP BY %s
    ORDER BY period_start DESC',
    date_trunc_func, date_trunc_func, group_by, days_back, date_trunc_func
  );
END;
$$;

-- 2. Get revenue analytics with status breakdown
CREATE OR REPLACE FUNCTION public.get_revenue_analytics(
  days_back INTEGER DEFAULT 90
)
RETURNS TABLE (
  status TEXT,
  booking_count BIGINT,
  total_revenue NUMERIC,
  avg_booking_value NUMERIC,
  revenue_last_30_days NUMERIC,
  revenue_trend NUMERIC -- percentage change from previous period
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    WITH current_period AS (
      SELECT 
        b.status,
        COUNT(*) as booking_count,
        COALESCE(SUM(b.total_amount), 0) as total_revenue,
        COALESCE(AVG(b.total_amount), 0) as avg_booking_value,
        COALESCE(SUM(b.total_amount) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL ''30 days''), 0) as revenue_last_30_days
      FROM public.bookings b
      WHERE b.created_at >= CURRENT_DATE - INTERVAL ''%s days''
      GROUP BY b.status
    ),
    previous_period AS (
      SELECT 
        b.status,
        COALESCE(SUM(b.total_amount), 0) as total_revenue
      FROM public.bookings b
      WHERE b.created_at >= CURRENT_DATE - INTERVAL ''%s days''
        AND b.created_at < CURRENT_DATE - INTERVAL ''%s days''
      GROUP BY b.status
    )
    SELECT 
      cp.status,
      cp.booking_count,
      cp.total_revenue,
      cp.avg_booking_value,
      cp.revenue_last_30_days,
      CASE 
        WHEN pp.total_revenue > 0 THEN
          ROUND(((cp.total_revenue - pp.total_revenue) / pp.total_revenue) * 100, 1)
        ELSE 0
      END as revenue_trend
    FROM current_period cp
    LEFT JOIN previous_period pp ON cp.status = pp.status
    ORDER BY cp.total_revenue DESC',
    days_back, days_back * 2, days_back
  );
END;
$$;

-- 3. Get completion time analytics
CREATE OR REPLACE FUNCTION public.get_completion_analytics(
  days_back INTEGER DEFAULT 90,
  group_by TEXT DEFAULT 'week'
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_bookings BIGINT,
  completed_bookings BIGINT,
  avg_completion_days NUMERIC,
  avg_progress NUMERIC,
  total_revenue NUMERIC,
  completion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  date_trunc_func TEXT;
BEGIN
  -- Validate group_by parameter
  IF group_by NOT IN ('day', 'week', 'month') THEN
    RAISE EXCEPTION 'group_by must be one of: day, week, month';
  END IF;
  
  date_trunc_func := 'DATE_TRUNC(''' || group_by || ''', created_at)';
  
  RETURN QUERY EXECUTE format('
    SELECT 
      %s as period_start,
      %s + INTERVAL ''1 %s'' as period_end,
      COUNT(*) as total_bookings,
      COUNT(*) FILTER (WHERE status = ''completed'') as completed_bookings,
      NULL as avg_completion_days, -- Completion time calculation not available without completion timestamp
      ROUND(AVG(progress_percentage)::NUMERIC, 1) as avg_progress,
      COALESCE(SUM(total_amount) , 0) as total_revenue,
      ROUND(
        (COUNT(*) FILTER (WHERE status = ''completed'')::NUMERIC / 
         NULLIF(COUNT(*), 0)) * 100, 1
      ) as completion_rate
    FROM public.bookings
    WHERE created_at >= CURRENT_DATE - INTERVAL ''%s days''
    GROUP BY %s
    ORDER BY period_start DESC',
    date_trunc_func, date_trunc_func, group_by, days_back, date_trunc_func
  );
END;
$$;

-- 4. Get service performance analytics
CREATE OR REPLACE FUNCTION public.get_service_performance(
  days_back INTEGER DEFAULT 90,
  min_bookings INTEGER DEFAULT 1
)
RETURNS TABLE (
  service_id UUID,
  service_title TEXT,
  service_category TEXT,
  total_bookings BIGINT,
  completed_bookings BIGINT,
  completion_rate NUMERIC,
  avg_progress NUMERIC,
  total_revenue NUMERIC,
  avg_completion_days NUMERIC,
  avg_booking_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
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
    COALESCE(SUM(b.total_amount) , 0) as total_revenue,
    NULL as avg_completion_days, -- Completion time calculation not available without completion timestamp
    ROUND(AVG(b.total_amount) , 0) as avg_booking_value
  FROM public.services s
  LEFT JOIN public.bookings b ON s.id = b.service_id
  WHERE b.created_at >= CURRENT_DATE - make_interval(days => days_back) OR b.created_at IS NULL
  GROUP BY s.id, s.title, s.category
  HAVING COUNT(b.id) >= min_bookings
  ORDER BY total_revenue DESC;
END;
$$;

-- 5. Get KPI summary for dashboard
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_bookings BIGINT,
  completed_bookings BIGINT,
  in_progress_bookings BIGINT,
  pending_bookings BIGINT,
  total_revenue NUMERIC,
  completed_revenue NUMERIC,
  avg_completion_days NUMERIC,
  completion_rate NUMERIC,
  avg_progress NUMERIC,
  revenue_growth NUMERIC,
  booking_growth NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      COUNT(*) as total_bookings,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_bookings,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
      COALESCE(SUM(total_amount) , 0) as total_revenue,
      COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed') , 0) as completed_revenue,
      NULL as avg_completion_days, -- Completion time calculation not available without completion timestamp
      ROUND(AVG(progress_percentage)::NUMERIC, 1) as avg_progress
    FROM public.bookings
    WHERE created_at >= CURRENT_DATE - make_interval(days => days_back)
  ),
  previous_period AS (
    SELECT 
      COUNT(*) as total_bookings,
      COALESCE(SUM(total_amount) , 0) as total_revenue
    FROM public.bookings
    WHERE created_at >= CURRENT_DATE - make_interval(days => days_back * 2)
      AND created_at < CURRENT_DATE - make_interval(days => days_back)
  )
  SELECT 
    cp.total_bookings,
    cp.completed_bookings,
    cp.in_progress_bookings,
    cp.pending_bookings,
    cp.total_revenue,
    cp.completed_revenue,
    cp.avg_completion_days,
    ROUND(
      (cp.completed_bookings::NUMERIC / NULLIF(cp.total_bookings, 0)) * 100, 1
    ) as completion_rate,
    cp.avg_progress,
    CASE 
      WHEN pp.total_revenue > 0 THEN
        ROUND(((cp.total_revenue - pp.total_revenue) / pp.total_revenue) * 100, 1)
      ELSE 0
    END as revenue_growth,
    CASE 
      WHEN pp.total_bookings > 0 THEN
        ROUND(((cp.total_bookings - pp.total_bookings)::NUMERIC / pp.total_bookings) * 100, 1)
      ELSE 0
    END as booking_growth
  FROM current_period cp
  CROSS JOIN previous_period pp;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_booking_trends TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_completion_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_kpis TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_booking_trends IS 'Get time-series booking trends with flexible date ranges and grouping';
COMMENT ON FUNCTION public.get_revenue_analytics IS 'Get revenue analytics with status breakdown and trend analysis';
COMMENT ON FUNCTION public.get_completion_analytics IS 'Get completion time analytics with flexible grouping';
COMMENT ON FUNCTION public.get_service_performance IS 'Get service-level performance metrics and completion rates';
COMMENT ON FUNCTION public.get_dashboard_kpis IS 'Get comprehensive KPI summary for dashboard display';
