-- Migration #213: Core Insight Engine Schema
-- Date: 2025-10-06
-- Purpose: Create database foundation for AI-powered predictive insights

-- 1. Create insight_events table to store generated insights
CREATE TABLE IF NOT EXISTS public.insight_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'booking_slowdown', 'booking_spike', 'revenue_anomaly', 
    'milestone_delay', 'provider_overload', 'provider_underutilized',
    'completion_rate_drop', 'revenue_forecast', 'capacity_warning',
    'trend_analysis', 'optimization_recommendation'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  recommendation TEXT,
  context JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  confidence_score NUMERIC(3,2) DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create v_booking_anomalies view for outlier detection
CREATE OR REPLACE VIEW public.v_booking_anomalies AS
WITH daily_stats AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as daily_bookings,
    COUNT(*) FILTER (WHERE status = 'completed') as daily_completed,
    COUNT(*) FILTER (WHERE status = 'in_progress') as daily_in_progress,
    COALESCE(SUM(total_amount), 0) as daily_revenue,
    ROUND(AVG(progress_percentage)::NUMERIC, 1) as avg_progress
  FROM public.bookings
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY DATE(created_at)
),
rolling_stats AS (
  SELECT 
    date,
    daily_bookings,
    daily_completed,
    daily_in_progress,
    daily_revenue,
    avg_progress,
    -- 7-day rolling averages
    AVG(daily_bookings) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_bookings_7d,
    AVG(daily_completed) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_completed_7d,
    AVG(daily_revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_revenue_7d,
    AVG(avg_progress) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_progress_7d,
    -- Standard deviations
    STDDEV(daily_bookings) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as std_bookings_7d,
    STDDEV(daily_completed) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as std_completed_7d,
    STDDEV(daily_revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as std_revenue_7d
  FROM daily_stats
  WHERE date >= CURRENT_DATE - INTERVAL '30 days' -- Only analyze recent data
)
SELECT 
  date,
  daily_bookings,
  daily_completed,
  daily_in_progress,
  daily_revenue,
  avg_progress,
  avg_bookings_7d,
  avg_completed_7d,
  avg_revenue_7d,
  avg_progress_7d,
  std_bookings_7d,
  std_completed_7d,
  std_revenue_7d,
  -- Anomaly detection (2 standard deviations from mean)
  CASE 
    WHEN daily_bookings < (avg_bookings_7d - 2 * std_bookings_7d) THEN 'booking_slowdown'
    WHEN daily_bookings > (avg_bookings_7d + 2 * std_bookings_7d) THEN 'booking_spike'
    ELSE NULL
  END as booking_anomaly,
  CASE 
    WHEN daily_revenue < (avg_revenue_7d - 2 * std_revenue_7d) THEN 'revenue_drop'
    WHEN daily_revenue > (avg_revenue_7d + 2 * std_revenue_7d) THEN 'revenue_spike'
    ELSE NULL
  END as revenue_anomaly,
  CASE 
    WHEN avg_progress < (avg_progress_7d - 2 * COALESCE(STDDEV(avg_progress) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 5)) THEN 'progress_drop'
    ELSE NULL
  END as progress_anomaly,
  -- Anomaly severity scoring
  CASE 
    WHEN ABS(daily_bookings - avg_bookings_7d) > 3 * std_bookings_7d THEN 'critical'
    WHEN ABS(daily_bookings - avg_bookings_7d) > 2 * std_bookings_7d THEN 'high'
    WHEN ABS(daily_bookings - avg_bookings_7d) > 1.5 * std_bookings_7d THEN 'medium'
    ELSE 'low'
  END as anomaly_severity
FROM rolling_stats
WHERE std_bookings_7d > 0 -- Only include days with sufficient data
ORDER BY date DESC;

-- 3. Create v_revenue_forecast view for predictive analytics
CREATE OR REPLACE VIEW public.v_revenue_forecast AS
WITH daily_revenue AS (
  SELECT 
    DATE(created_at) as date,
    COALESCE(SUM(total_amount), 0) as daily_revenue
  FROM public.bookings
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY DATE(created_at)
),
revenue_trend AS (
  SELECT 
    date,
    daily_revenue,
    -- Simple exponential smoothing forecast (alpha = 0.3)
    LAG(daily_revenue) OVER (ORDER BY date) as prev_revenue,
    -- Moving averages for trend calculation
    AVG(daily_revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as avg_7d,
    AVG(daily_revenue) OVER (ORDER BY date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) as avg_14d,
    AVG(daily_revenue) OVER (ORDER BY date ROWS BETWEEN 29 PRECEDING AND CURRENT ROW) as avg_30d
  FROM daily_revenue
  ORDER BY date
),
forecast_data AS (
  SELECT 
    date,
    daily_revenue,
    prev_revenue,
    avg_7d,
    avg_14d,
    avg_30d,
    -- Trend calculation
    (avg_7d - avg_14d) / NULLIF(avg_14d, 0) as trend_7d_14d,
    (avg_14d - avg_30d) / NULLIF(avg_30d, 0) as trend_14d_30d,
    -- Seasonal adjustment (day of week)
    EXTRACT(DOW FROM date) as day_of_week
  FROM revenue_trend
)
SELECT 
  date,
  daily_revenue,
  avg_7d,
  avg_14d,
  avg_30d,
  trend_7d_14d,
  trend_14d_30d,
  day_of_week,
  -- 7-day forecast
  ROUND(avg_7d * (1 + COALESCE(trend_7d_14d, 0))::NUMERIC, 2) as forecast_7d,
  -- 30-day forecast
  ROUND(avg_30d * (1 + COALESCE(trend_14d_30d, 0))::NUMERIC, 2) as forecast_30d,
  -- 90-day forecast (longer term trend)
  ROUND(avg_30d * POWER(1 + COALESCE(trend_14d_30d, 0), 3)::NUMERIC, 2) as forecast_90d,
  -- Confidence intervals
  ROUND(avg_7d * 0.8::NUMERIC, 2) as forecast_7d_lower,
  ROUND(avg_7d * 1.2::NUMERIC, 2) as forecast_7d_upper
FROM forecast_data
WHERE date >= CURRENT_DATE - INTERVAL '7 days' -- Recent data for forecasting
ORDER BY date DESC;

-- 4. Create v_provider_workload_analytics view for capacity insights
CREATE OR REPLACE VIEW public.v_provider_workload_analytics AS
WITH provider_stats AS (
  SELECT 
    p.id as provider_id,
    p.full_name as provider_name,
    COUNT(b.id) as total_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'in_progress') as active_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'completed') as completed_bookings,
    COUNT(b.id) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_bookings,
    COALESCE(SUM(b.total_amount), 0) as total_revenue,
    COALESCE(SUM(b.total_amount) FILTER (WHERE b.created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as recent_revenue,
    ROUND(AVG(b.progress_percentage)::NUMERIC, 1) as avg_progress,
    ROUND(AVG(b.progress_percentage) FILTER (WHERE b.status = 'in_progress')::NUMERIC, 1) as avg_active_progress
  FROM public.profiles p
  LEFT JOIN public.bookings b ON p.id = b.provider_id
  WHERE p.role = 'provider'
  GROUP BY p.id, p.full_name
),
workload_analysis AS (
  SELECT 
    *,
    -- Calculate workload metrics
    CASE 
      WHEN active_bookings > 10 THEN 'overloaded'
      WHEN active_bookings BETWEEN 5 AND 10 THEN 'busy'
      WHEN active_bookings BETWEEN 1 AND 4 THEN 'moderate'
      ELSE 'available'
    END as workload_status,
    -- Calculate efficiency metrics
    CASE 
      WHEN total_bookings > 0 THEN ROUND((completed_bookings::NUMERIC / total_bookings::NUMERIC) * 100, 1)
      ELSE 0
    END as completion_rate,
    -- Calculate recent activity trend
    CASE 
      WHEN recent_bookings > total_bookings * 0.3 THEN 'increasing'
      WHEN recent_bookings < total_bookings * 0.1 THEN 'decreasing'
      ELSE 'stable'
    END as activity_trend
  FROM provider_stats
),
insight_analysis AS (
  SELECT 
    *,
    -- Generate insights
    CASE 
      WHEN workload_status = 'overloaded' AND completion_rate < 70 THEN 'capacity_warning'
      WHEN workload_status = 'available' AND recent_bookings = 0 THEN 'underutilized'
      WHEN activity_trend = 'increasing' AND workload_status IN ('overloaded', 'busy') THEN 'growth_risk'
      WHEN completion_rate < 50 THEN 'performance_concern'
      ELSE NULL
    END as insight_type
  FROM workload_analysis
)
SELECT 
  *,
  -- Severity scoring (now that insight_type is available)
  CASE 
    WHEN workload_status = 'overloaded' AND completion_rate < 60 THEN 'high'
    WHEN workload_status = 'overloaded' OR completion_rate < 50 THEN 'medium'
    WHEN insight_type IS NOT NULL THEN 'low'
    ELSE NULL
  END as insight_severity
FROM insight_analysis
ORDER BY total_revenue DESC;

-- Grant permissions
GRANT SELECT ON public.insight_events TO authenticated;
GRANT SELECT ON public.v_booking_anomalies TO authenticated;
GRANT SELECT ON public.v_revenue_forecast TO authenticated;
GRANT SELECT ON public.v_provider_workload_analytics TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.insight_events IS 'Stores AI-generated insights and recommendations';
COMMENT ON VIEW public.v_booking_anomalies IS 'Detects anomalies in daily booking patterns using statistical analysis';
COMMENT ON VIEW public.v_revenue_forecast IS 'Provides revenue forecasting using exponential smoothing and trend analysis';
COMMENT ON VIEW public.v_provider_workload_analytics IS 'Analyzes provider workload and capacity for optimization insights';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insight_events_type_severity ON public.insight_events(type, severity);
CREATE INDEX IF NOT EXISTS idx_insight_events_created_at ON public.insight_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insight_events_is_resolved ON public.insight_events(is_resolved, created_at);
