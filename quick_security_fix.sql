-- Quick Security Fix Script
-- Run this directly in Supabase SQL Editor to fix all security issues immediately

-- =============================================
-- 1. Enable RLS on Tables
-- =============================================

-- Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tables with no RLS
ALTER TABLE public.insight_run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_events ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Create RLS Policies for Tables Without Policies
-- =============================================

-- Insight run logs: Service role only
DROP POLICY IF EXISTS "Service role can manage insight_run_logs" ON public.insight_run_logs;
CREATE POLICY "Service role can manage insight_run_logs" ON public.insight_run_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Notification channels: Read access for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view notification_channels" ON public.notification_channels;
DROP POLICY IF EXISTS "Service role can manage notification_channels" ON public.notification_channels;
CREATE POLICY "Authenticated users can view notification_channels" ON public.notification_channels
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Service role can manage notification_channels" ON public.notification_channels
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Insight notifications: Service role and authenticated read
DROP POLICY IF EXISTS "Service role can manage insight_notifications" ON public.insight_notifications;
DROP POLICY IF EXISTS "Authenticated users can view insight_notifications" ON public.insight_notifications;
CREATE POLICY "Service role can manage insight_notifications" ON public.insight_notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Authenticated users can view insight_notifications" ON public.insight_notifications
  FOR SELECT TO authenticated
  USING (true);

-- Insight events: Service role only
DROP POLICY IF EXISTS "Service role can manage insight_events" ON public.insight_events;
CREATE POLICY "Service role can manage insight_events" ON public.insight_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 3. Fix SECURITY DEFINER Views (Remove Property)
-- =============================================

-- Drop and recreate views without SECURITY DEFINER
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

-- Note: The views will be recreated by the full migration
-- For now, just dropping them removes the SECURITY DEFINER issue

-- =============================================
-- 4. Verification
-- =============================================

DO $$
DECLARE
    rls_disabled_count INTEGER;
BEGIN
    -- Check for tables with RLS disabled
    SELECT COUNT(*)
    INTO rls_disabled_count
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public' 
    AND t.tablename IN ('bookings', 'tasks', 'insight_run_logs', 'notification_channels', 'insight_notifications', 'insight_events')
    AND NOT c.relrowsecurity;
    
    RAISE NOTICE 'Quick Security Fix Applied:';
    RAISE NOTICE '- Tables with RLS disabled: %', rls_disabled_count;
    
    IF rls_disabled_count = 0 THEN
        RAISE NOTICE '✅ RLS enabled on all required tables!';
        RAISE NOTICE '✅ SECURITY DEFINER views dropped!';
        RAISE NOTICE '📝 Run the full migration to recreate views properly.';
    ELSE
        RAISE NOTICE '⚠️  Some tables may still have RLS disabled.';
    END IF;
END $$;
