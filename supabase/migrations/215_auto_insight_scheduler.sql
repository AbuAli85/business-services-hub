-- Migration #215: Automated Insight Generation Scheduler
-- Date: 2025-10-06
-- Purpose: Create automated insight generation with pg_cron scheduling and run logging

-- 1. Create insight_run_logs table to track automated runs
CREATE TABLE IF NOT EXISTS public.insight_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ DEFAULT NOW(),
  total_insights INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'warning')),
  error_message TEXT,
  duration_ms NUMERIC(10,2),
  insights_generated JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create notification_channels table for different notification targets
CREATE TABLE IF NOT EXISTS public.notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('slack', 'email', 'webhook', 'dashboard')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  severity_filter TEXT[] DEFAULT ARRAY['critical', 'high'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create insight_notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS public.insight_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES public.insight_events(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.notification_channels(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create automated insight generation wrapper function
CREATE OR REPLACE FUNCTION public.fn_auto_generate_insights()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _start TIMESTAMPTZ := clock_timestamp();
  _count INTEGER := 0;
  _insights_before INTEGER;
  _insights_after INTEGER;
  _generated_insights JSONB := '[]';
  _insight_record RECORD;
  _status TEXT := 'success';
  _error_message TEXT;
BEGIN
  -- Get count of insights before generation
  SELECT COUNT(*) INTO _insights_before 
  FROM public.insight_events 
  WHERE created_at >= NOW() - INTERVAL '1 day';

  -- Generate insights
  BEGIN
    -- Call the main insight generation function
    FOR _insight_record IN 
      SELECT * FROM public.generate_daily_insights()
    LOOP
      _count := _count + 1;
      _generated_insights := _generated_insights || jsonb_build_object(
        'id', _insight_record.insight_id,
        'type', _insight_record.type,
        'severity', _insight_record.severity,
        'title', _insight_record.title
      );
    END LOOP;

    -- Get count of insights after generation
    SELECT COUNT(*) INTO _insights_after 
    FROM public.insight_events 
    WHERE created_at >= NOW() - INTERVAL '1 day';

    -- Log successful run
    INSERT INTO public.insight_run_logs (
      total_insights,
      status,
      duration_ms,
      insights_generated,
      metadata
    ) VALUES (
      _count,
      _status,
      EXTRACT(milliseconds FROM clock_timestamp() - _start),
      _generated_insights,
      jsonb_build_object(
        'insights_before', _insights_before,
        'insights_after', _insights_after,
        'net_new_insights', _count,
        'generation_method', 'automated_daily',
        'trigger_source', 'pg_cron'
      )
    );

    -- Log success
    RAISE NOTICE 'Automated insight generation completed successfully: % insights generated in % ms', 
      _count, EXTRACT(milliseconds FROM clock_timestamp() - _start);

  EXCEPTION WHEN OTHERS THEN
    _status := 'error';
    _error_message := SQLERRM;
    
    -- Log error
    INSERT INTO public.insight_run_logs (
      status,
      error_message,
      duration_ms,
      metadata
    ) VALUES (
      _status,
      _error_message,
      EXTRACT(milliseconds FROM clock_timestamp() - _start),
      jsonb_build_object(
        'generation_method', 'automated_daily',
        'trigger_source', 'pg_cron',
        'error_context', 'insight_generation_failed'
      )
    );

    -- Re-raise the exception
    RAISE EXCEPTION 'Automated insight generation failed: %', _error_message;
  END;
END;
$$;

-- 5. Create function to get recent insights for notifications
CREATE OR REPLACE FUNCTION public.get_insights_for_notification(
  hours_back INTEGER DEFAULT 24,
  min_severity TEXT DEFAULT 'high'
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  severity TEXT,
  title TEXT,
  summary TEXT,
  recommendation TEXT,
  confidence_score NUMERIC,
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
    ie.created_at
  FROM public.insight_events ie
  WHERE ie.created_at >= NOW() - make_interval(hours => hours_back)
    AND ie.is_resolved = FALSE
    AND (
      CASE min_severity
        WHEN 'critical' THEN ie.severity = 'critical'
        WHEN 'high' THEN ie.severity IN ('critical', 'high')
        WHEN 'medium' THEN ie.severity IN ('critical', 'high', 'medium')
        ELSE TRUE
      END
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.insight_notifications in2
      WHERE in2.insight_id = ie.id
        AND in2.status = 'sent'
        AND in2.created_at >= NOW() - make_interval(hours => hours_back)
    )
  ORDER BY 
    CASE ie.severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      ELSE 4 
    END,
    ie.confidence_score DESC,
    ie.created_at DESC;
END;
$$;

-- 6. Create function to log notification attempts
CREATE OR REPLACE FUNCTION public.log_notification_attempt(
  p_insight_id UUID,
  p_channel_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.insight_notifications (
    insight_id,
    channel_id,
    status,
    error_message,
    metadata,
    sent_at
  ) VALUES (
    p_insight_id,
    p_channel_id,
    p_status,
    p_error_message,
    p_metadata,
    CASE WHEN p_status = 'sent' THEN NOW() ELSE NULL END
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- 7. Create function to get run statistics
CREATE OR REPLACE FUNCTION public.get_insight_run_stats(
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_runs BIGINT,
  successful_runs BIGINT,
  failed_runs BIGINT,
  avg_duration_ms NUMERIC,
  total_insights_generated BIGINT,
  avg_insights_per_run NUMERIC,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE status = 'success') as successful_runs,
    COUNT(*) FILTER (WHERE status = 'error') as failed_runs,
    ROUND(AVG(duration_ms)::NUMERIC, 2) as avg_duration_ms,
    SUM(total_insights) as total_insights_generated,
    ROUND(AVG(total_insights)::NUMERIC, 1) as avg_insights_per_run,
    MAX(run_at) as last_run_at,
    (
      SELECT status 
      FROM public.insight_run_logs 
      WHERE run_at = MAX(irl.run_at)
      LIMIT 1
    ) as last_run_status
  FROM public.insight_run_logs irl
  WHERE run_at >= NOW() - make_interval(days => days_back);
END;
$$;

-- 8. Insert default notification channels
INSERT INTO public.notification_channels (name, type, config, severity_filter) VALUES
  ('executive-alerts', 'slack', '{"webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK", "channel": "#executive-alerts"}', ARRAY['critical']),
  ('business-insights', 'email', '{"recipients": ["admin@yourcompany.com"], "subject_template": "Daily Business Insights"}', ARRAY['critical', 'high']),
  ('dashboard-notifications', 'dashboard', '{"show_toast": true, "auto_dismiss": false}', ARRAY['critical', 'high', 'medium'])
ON CONFLICT (name) DO NOTHING;

-- 9. Schedule automated insight generation (8 AM UTC daily)
-- Note: This requires pg_cron extension to be enabled
-- SELECT cron.schedule('auto_insights_daily', '0 8 * * *', 'SELECT public.fn_auto_generate_insights();');

-- 10. Create function to manually trigger insight generation (for testing)
CREATE OR REPLACE FUNCTION public.trigger_manual_insight_generation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  run_log_id UUID;
BEGIN
  -- Call the automated function
  PERFORM public.fn_auto_generate_insights();
  
  -- Get the latest run log
  SELECT 
    jsonb_build_object(
      'id', id,
      'run_at', run_at,
      'total_insights', total_insights,
      'status', status,
      'duration_ms', duration_ms,
      'error_message', error_message
    )
  INTO result
  FROM public.insight_run_logs
  ORDER BY run_at DESC
  LIMIT 1;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Grant permissions
GRANT SELECT ON public.insight_run_logs TO authenticated;
GRANT SELECT ON public.notification_channels TO authenticated;
GRANT SELECT ON public.insight_notifications TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_auto_generate_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_insights_for_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_notification_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_insight_run_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_manual_insight_generation TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.insight_run_logs IS 'Logs automated insight generation runs with performance metrics';
COMMENT ON TABLE public.notification_channels IS 'Configuration for different notification delivery channels';
COMMENT ON TABLE public.insight_notifications IS 'Tracks notification delivery attempts and status';
COMMENT ON FUNCTION public.fn_auto_generate_insights IS 'Automated wrapper for daily insight generation with logging';
COMMENT ON FUNCTION public.get_insights_for_notification IS 'Retrieves recent insights suitable for notification delivery';
COMMENT ON FUNCTION public.log_notification_attempt IS 'Logs notification delivery attempts with status tracking';
COMMENT ON FUNCTION public.get_insight_run_stats IS 'Provides statistics on automated insight generation runs';
COMMENT ON FUNCTION public.trigger_manual_insight_generation IS 'Manually triggers insight generation for testing purposes';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insight_run_logs_run_at ON public.insight_run_logs(run_at DESC);
CREATE INDEX IF NOT EXISTS idx_insight_run_logs_status ON public.insight_run_logs(status, run_at DESC);
CREATE INDEX IF NOT EXISTS idx_insight_notifications_insight_id ON public.insight_notifications(insight_id);
CREATE INDEX IF NOT EXISTS idx_insight_notifications_channel_id ON public.insight_notifications(channel_id);
CREATE INDEX IF NOT EXISTS idx_insight_notifications_status ON public.insight_notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_channels_active ON public.notification_channels(is_active, type);
