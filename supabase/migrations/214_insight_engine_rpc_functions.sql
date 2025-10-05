-- Migration #214: Core Insight Engine RPC Functions
-- Date: 2025-10-06
-- Purpose: Create RPC functions for AI-powered insight generation

-- 1. Function to detect anomalies in booking patterns
CREATE OR REPLACE FUNCTION public.detect_anomalies(
  days_back INTEGER DEFAULT 30,
  sensitivity NUMERIC DEFAULT 2.0 -- Standard deviations threshold
)
RETURNS TABLE (
  date DATE,
  anomaly_type TEXT,
  severity TEXT,
  current_value NUMERIC,
  expected_value NUMERIC,
  deviation_percent NUMERIC,
  confidence_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH daily_metrics AS (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as bookings,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COALESCE(SUM(total_amount), 0) as revenue,
      ROUND(AVG(progress_percentage)::NUMERIC, 1) as avg_progress
    FROM public.bookings
    WHERE created_at >= CURRENT_DATE - make_interval(days => days_back)
    GROUP BY DATE(created_at)
  ),
  rolling_stats AS (
    SELECT 
      date,
      bookings,
      completed,
      revenue,
      avg_progress,
      AVG(bookings) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_bookings_7d,
      STDDEV(bookings) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as std_bookings_7d,
      AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_revenue_7d,
      STDDEV(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as std_revenue_7d,
      AVG(completed) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_completed_7d,
      STDDEV(completed) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as std_completed_7d
    FROM daily_metrics
    WHERE date >= CURRENT_DATE - make_interval(days => 7) -- Need at least 7 days for rolling stats
  )
  SELECT 
    rs.date,
    CASE 
      WHEN rs.bookings < (rs.avg_bookings_7d - sensitivity * rs.std_bookings_7d) THEN 'booking_slowdown'
      WHEN rs.bookings > (rs.avg_bookings_7d + sensitivity * rs.std_bookings_7d) THEN 'booking_spike'
      WHEN rs.revenue < (rs.avg_revenue_7d - sensitivity * rs.std_revenue_7d) THEN 'revenue_drop'
      WHEN rs.revenue > (rs.avg_revenue_7d + sensitivity * rs.std_revenue_7d) THEN 'revenue_spike'
      WHEN rs.completed < (rs.avg_completed_7d - sensitivity * rs.std_completed_7d) THEN 'completion_drop'
      ELSE NULL
    END as anomaly_type,
    CASE 
      WHEN ABS(rs.bookings - rs.avg_bookings_7d) > 3 * rs.std_bookings_7d THEN 'critical'
      WHEN ABS(rs.bookings - rs.avg_bookings_7d) > 2 * rs.std_bookings_7d THEN 'high'
      WHEN ABS(rs.bookings - rs.avg_bookings_7d) > 1.5 * rs.std_bookings_7d THEN 'medium'
      ELSE 'low'
    END as severity,
    CASE 
      WHEN rs.bookings < (rs.avg_bookings_7d - sensitivity * rs.std_bookings_7d) OR 
           rs.bookings > (rs.avg_bookings_7d + sensitivity * rs.std_bookings_7d) THEN rs.bookings
      WHEN rs.revenue < (rs.avg_revenue_7d - sensitivity * rs.std_revenue_7d) OR 
           rs.revenue > (rs.avg_revenue_7d + sensitivity * rs.std_revenue_7d) THEN rs.revenue
      WHEN rs.completed < (rs.avg_completed_7d - sensitivity * rs.std_completed_7d) THEN rs.completed
      ELSE NULL
    END as current_value,
    CASE 
      WHEN rs.bookings < (rs.avg_bookings_7d - sensitivity * rs.std_bookings_7d) OR 
           rs.bookings > (rs.avg_bookings_7d + sensitivity * rs.std_bookings_7d) THEN rs.avg_bookings_7d
      WHEN rs.revenue < (rs.avg_revenue_7d - sensitivity * rs.std_revenue_7d) OR 
           rs.revenue > (rs.avg_revenue_7d + sensitivity * rs.std_revenue_7d) THEN rs.avg_revenue_7d
      WHEN rs.completed < (rs.avg_completed_7d - sensitivity * rs.std_completed_7d) THEN rs.avg_completed_7d
      ELSE NULL
    END as expected_value,
    CASE 
      WHEN rs.bookings < (rs.avg_bookings_7d - sensitivity * rs.std_bookings_7d) OR 
           rs.bookings > (rs.avg_bookings_7d + sensitivity * rs.std_bookings_7d) THEN 
        ROUND(((rs.bookings - rs.avg_bookings_7d) / NULLIF(rs.avg_bookings_7d, 0)) * 100, 1)
      WHEN rs.revenue < (rs.avg_revenue_7d - sensitivity * rs.std_revenue_7d) OR 
           rs.revenue > (rs.avg_revenue_7d + sensitivity * rs.std_revenue_7d) THEN 
        ROUND(((rs.revenue - rs.avg_revenue_7d) / NULLIF(rs.avg_revenue_7d, 0)) * 100, 1)
      WHEN rs.completed < (rs.avg_completed_7d - sensitivity * rs.std_completed_7d) THEN 
        ROUND(((rs.completed - rs.avg_completed_7d) / NULLIF(rs.avg_completed_7d, 0)) * 100, 1)
      ELSE NULL
    END as deviation_percent,
    CASE 
      WHEN ABS(rs.bookings - rs.avg_bookings_7d) > 3 * rs.std_bookings_7d THEN 0.95
      WHEN ABS(rs.bookings - rs.avg_bookings_7d) > 2 * rs.std_bookings_7d THEN 0.85
      WHEN ABS(rs.bookings - rs.avg_bookings_7d) > 1.5 * rs.std_bookings_7d THEN 0.75
      ELSE 0.65
    END as confidence_score
  FROM rolling_stats rs
  WHERE rs.std_bookings_7d > 0 
    AND (
      rs.bookings < (rs.avg_bookings_7d - sensitivity * rs.std_bookings_7d) OR
      rs.bookings > (rs.avg_bookings_7d + sensitivity * rs.std_bookings_7d) OR
      rs.revenue < (rs.avg_revenue_7d - sensitivity * rs.std_revenue_7d) OR
      rs.revenue > (rs.avg_revenue_7d + sensitivity * rs.std_revenue_7d) OR
      rs.completed < (rs.avg_completed_7d - sensitivity * rs.std_completed_7d)
    )
  ORDER BY rs.date DESC;
END;
$$;

-- 2. Function to forecast revenue using exponential smoothing
CREATE OR REPLACE FUNCTION public.forecast_revenue(
  days_ahead INTEGER DEFAULT 30,
  alpha NUMERIC DEFAULT 0.3 -- Smoothing factor
)
RETURNS TABLE (
  forecast_date DATE,
  forecasted_revenue NUMERIC,
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  trend_direction TEXT,
  trend_strength NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  latest_revenue NUMERIC;
  trend_slope NUMERIC;
  base_date DATE;
BEGIN
  -- Get the latest revenue data and trend
  SELECT 
    COALESCE(SUM(total_amount), 0),
    AVG(total_amount) OVER (ORDER BY DATE(created_at) ROWS BETWEEN 6 PRECEDING AND CURRENT ROW),
    DATE(MAX(created_at))
  INTO latest_revenue, latest_revenue, base_date
  FROM public.bookings
  WHERE created_at >= CURRENT_DATE - make_interval(days => 30);
  
  -- Calculate trend slope from recent data
  SELECT 
    (SUM((DATE(created_at) - base_date) * total_amount) - 
     COUNT(*) * AVG(DATE(created_at) - base_date) * AVG(total_amount)) /
    NULLIF(SUM(POWER(DATE(created_at) - base_date, 2)) - COUNT(*) * POWER(AVG(DATE(created_at) - base_date), 2), 0)
  INTO trend_slope
  FROM public.bookings
  WHERE created_at >= CURRENT_DATE - make_interval(days => 30);
  
  -- Generate forecasts
  RETURN QUERY
  SELECT 
    (base_date + (generate_series(1, days_ahead) || ' days')::INTERVAL)::DATE as forecast_date,
    ROUND((latest_revenue + trend_slope * generate_series(1, days_ahead))::NUMERIC, 2) as forecasted_revenue,
    ROUND((latest_revenue + trend_slope * generate_series(1, days_ahead) * 0.8)::NUMERIC, 2) as confidence_lower,
    ROUND((latest_revenue + trend_slope * generate_series(1, days_ahead) * 1.2)::NUMERIC, 2) as confidence_upper,
    CASE 
      WHEN trend_slope > 0 THEN 'increasing'
      WHEN trend_slope < 0 THEN 'decreasing'
      ELSE 'stable'
    END as trend_direction,
    ROUND(ABS(trend_slope)::NUMERIC, 4) as trend_strength;
END;
$$;

-- 3. Function to generate daily insights by aggregating anomalies and forecasts
CREATE OR REPLACE FUNCTION public.generate_daily_insights()
RETURNS TABLE (
  insight_id UUID,
  type TEXT,
  severity TEXT,
  title TEXT,
  summary TEXT,
  recommendation TEXT,
  confidence_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  insight_record RECORD;
BEGIN
  -- Generate insights from anomalies
  FOR insight_record IN
    SELECT 
      gen_random_uuid() as id,
      anomaly_type as type,
      severity,
      CASE anomaly_type
        WHEN 'booking_slowdown' THEN 'Booking Volume Decline Detected'
        WHEN 'booking_spike' THEN 'Unusual Booking Increase'
        WHEN 'revenue_drop' THEN 'Revenue Decline Alert'
        WHEN 'revenue_spike' THEN 'Revenue Surge Detected'
        WHEN 'completion_drop' THEN 'Completion Rate Decline'
        ELSE 'Business Pattern Anomaly'
      END as title,
      CASE anomaly_type
        WHEN 'booking_slowdown' THEN 'Daily bookings fell ' || ABS(deviation_percent) || '% below expected levels.'
        WHEN 'booking_spike' THEN 'Daily bookings increased ' || deviation_percent || '% above normal levels.'
        WHEN 'revenue_drop' THEN 'Daily revenue decreased ' || ABS(deviation_percent) || '% from expected.'
        WHEN 'revenue_spike' THEN 'Daily revenue increased ' || deviation_percent || '% above normal.'
        WHEN 'completion_drop' THEN 'Completion rate dropped ' || ABS(deviation_percent) || '% below average.'
        ELSE 'Unusual pattern detected in business metrics.'
      END as summary,
      CASE anomaly_type
        WHEN 'booking_slowdown' THEN 'Investigate marketing effectiveness, provider availability, or market conditions.'
        WHEN 'booking_spike' THEN 'Prepare for increased workload and ensure adequate provider capacity.'
        WHEN 'revenue_drop' THEN 'Review pricing strategy and service offerings.'
        WHEN 'revenue_spike' THEN 'Capitalize on momentum and scale successful initiatives.'
        WHEN 'completion_drop' THEN 'Check provider workload and identify bottlenecks.'
        ELSE 'Analyze recent changes and their impact on business performance.'
      END as recommendation,
      confidence_score
    FROM public.detect_anomalies(30, 2.0)
    WHERE anomaly_type IS NOT NULL
    ORDER BY severity DESC, confidence_score DESC
    LIMIT 10
  LOOP
    -- Insert the insight
    INSERT INTO public.insight_events (
      id, type, severity, title, summary, recommendation, confidence_score, context
    ) VALUES (
      insight_record.id,
      insight_record.type,
      insight_record.severity,
      insight_record.title,
      insight_record.summary,
      insight_record.recommendation,
      insight_record.confidence_score,
      jsonb_build_object('generated_at', NOW(), 'source', 'anomaly_detection')
    );
    
    -- Return the generated insight
    RETURN QUERY SELECT 
      insight_record.id,
      insight_record.type,
      insight_record.severity,
      insight_record.title,
      insight_record.summary,
      insight_record.recommendation,
      insight_record.confidence_score;
  END LOOP;
  
  -- Generate provider workload insights
  FOR insight_record IN
    SELECT 
      gen_random_uuid() as id,
      insight_type as type,
      insight_severity as severity,
      CASE insight_type
        WHEN 'capacity_warning' THEN 'Provider Overload Alert'
        WHEN 'underutilized' THEN 'Provider Underutilization'
        WHEN 'growth_risk' THEN 'Growth Capacity Risk'
        WHEN 'performance_concern' THEN 'Performance Issue Detected'
        ELSE 'Provider Optimization Opportunity'
      END as title,
      CASE insight_type
        WHEN 'capacity_warning' THEN provider_name || ' is overloaded with ' || active_bookings || ' active bookings and ' || completion_rate || '% completion rate.'
        WHEN 'underutilized' THEN provider_name || ' has no recent bookings and may be underutilized.'
        WHEN 'growth_risk' THEN provider_name || ' is experiencing growth but may lack capacity.'
        WHEN 'performance_concern' THEN provider_name || ' has a completion rate of ' || completion_rate || '% which is below optimal.'
        ELSE 'Provider workload optimization opportunity identified.'
      END as summary,
      CASE insight_type
        WHEN 'capacity_warning' THEN 'Consider redistributing bookings or hiring additional capacity.'
        WHEN 'underutilized' THEN 'Increase marketing efforts or provide additional training.'
        WHEN 'growth_risk' THEN 'Scale provider capacity or implement workload balancing.'
        WHEN 'performance_concern' THEN 'Provide support, training, or workload adjustment.'
        ELSE 'Review provider allocation and optimization strategies.'
      END as recommendation,
      CASE insight_severity
        WHEN 'high' THEN 0.85
        WHEN 'medium' THEN 0.75
        WHEN 'low' THEN 0.65
        ELSE 0.5
      END as confidence_score
    FROM public.v_provider_workload_analytics
    WHERE insight_type IS NOT NULL
    ORDER BY insight_severity DESC
    LIMIT 5
  LOOP
    -- Insert the insight
    INSERT INTO public.insight_events (
      id, type, severity, title, summary, recommendation, confidence_score, context
    ) VALUES (
      insight_record.id,
      insight_record.type,
      insight_record.severity,
      insight_record.title,
      insight_record.summary,
      insight_record.recommendation,
      insight_record.confidence_score,
      jsonb_build_object('generated_at', NOW(), 'source', 'provider_analytics')
    );
    
    -- Return the generated insight
    RETURN QUERY SELECT 
      insight_record.id,
      insight_record.type,
      insight_record.severity,
      insight_record.title,
      insight_record.summary,
      insight_record.recommendation,
      insight_record.confidence_score;
  END LOOP;
END;
$$;

-- 4. Function to get latest insights for API/dashboard
CREATE OR REPLACE FUNCTION public.get_latest_insights(
  limit_count INTEGER DEFAULT 10,
  severity_filter TEXT DEFAULT NULL,
  type_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  severity TEXT,
  title TEXT,
  summary TEXT,
  recommendation TEXT,
  confidence_score NUMERIC,
  is_resolved BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ie.id,
    ie.type,
    ie.severity,
    ie.title,
    ie.summary,
    ie.recommendation,
    ie.confidence_score,
    ie.is_resolved,
    ie.created_at
  FROM public.insight_events ie
  WHERE 
    (severity_filter IS NULL OR ie.severity = severity_filter)
    AND (type_filter IS NULL OR ie.type = type_filter)
  ORDER BY 
    CASE ie.severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      WHEN 'low' THEN 4 
    END,
    ie.confidence_score DESC,
    ie.created_at DESC
  LIMIT limit_count;
END;
$$;

-- 5. Function to resolve an insight
CREATE OR REPLACE FUNCTION public.resolve_insight(
  insight_id UUID,
  resolved_by_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.insight_events
  SET 
    is_resolved = TRUE,
    resolved_at = NOW(),
    resolved_by = resolved_by_user_id,
    updated_at = NOW()
  WHERE id = insight_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.detect_anomalies TO authenticated;
GRANT EXECUTE ON FUNCTION public.forecast_revenue TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_insight TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.detect_anomalies IS 'Detects statistical anomalies in booking patterns using rolling averages and standard deviations';
COMMENT ON FUNCTION public.forecast_revenue IS 'Generates revenue forecasts using exponential smoothing and trend analysis';
COMMENT ON FUNCTION public.generate_daily_insights IS 'Aggregates anomalies and forecasts into actionable insights';
COMMENT ON FUNCTION public.get_latest_insights IS 'Retrieves recent insights with filtering options for API consumption';
COMMENT ON FUNCTION public.resolve_insight IS 'Marks an insight as resolved with user attribution';
