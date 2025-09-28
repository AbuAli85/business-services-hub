-- Manual migration to create missing tables
-- Copy and paste this into Supabase SQL Editor

-- 1. Create notification_rules table
CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('milestone_completion', 'task_due', 'task_overdue', 'booking_update', 'custom')),
    is_enabled BOOLEAN DEFAULT true,
    channels TEXT[] DEFAULT ARRAY['email']::TEXT[],
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add missing columns to audit_logs table
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS entity_type TEXT,
ADD COLUMN IF NOT EXISTS entity_id UUID,
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

-- 3. Create performance_metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('response_time', 'completion_rate', 'quality_score', 'client_satisfaction', 'efficiency', 'custom')),
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT,
    description TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4. Create slack_webhooks table
CREATE TABLE IF NOT EXISTS public.slack_webhooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    webhook_url TEXT NOT NULL,
    channel_name TEXT,
    is_enabled BOOLEAN DEFAULT true,
    events TEXT[] DEFAULT ARRAY['milestone_completed', 'task_due', 'booking_updated']::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. Create whatsapp_configs table
CREATE TABLE IF NOT EXISTS public.whatsapp_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    api_key TEXT,
    is_enabled BOOLEAN DEFAULT true,
    events TEXT[] DEFAULT ARRAY['milestone_completed', 'task_due', 'booking_updated']::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 6. Create load_test_results table
CREATE TABLE IF NOT EXISTS public.load_test_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    test_type TEXT NOT NULL CHECK (test_type IN ('api_load', 'database_load', 'ui_load', 'integration_load', 'stress_test', 'custom')),
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    average_response_time_ms NUMERIC,
    max_response_time_ms NUMERIC,
    min_response_time_ms NUMERIC,
    requests_per_second NUMERIC,
    error_rate NUMERIC,
    test_config JSONB DEFAULT '{}',
    results_data JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_rules_booking_id ON public.notification_rules(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_user_id ON public.notification_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_booking_id ON public.audit_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_booking_id ON public.performance_metrics(booking_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON public.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_slack_webhooks_booking_id ON public.slack_webhooks(booking_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_booking_id ON public.whatsapp_configs(booking_id);
CREATE INDEX IF NOT EXISTS idx_load_test_results_booking_id ON public.load_test_results(booking_id);
CREATE INDEX IF NOT EXISTS idx_load_test_results_test_type ON public.load_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_load_test_results_status ON public.load_test_results(status);

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.performance_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slack_webhooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.load_test_results TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

-- 9. Add RLS policies
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slack_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_test_results ENABLE ROW LEVEL SECURITY;

-- Notification rules policies
DROP POLICY IF EXISTS "Users can view their own notification rules" ON public.notification_rules;
DROP POLICY IF EXISTS "Users can insert their own notification rules" ON public.notification_rules;
DROP POLICY IF EXISTS "Users can update their own notification rules" ON public.notification_rules;
DROP POLICY IF EXISTS "Users can delete their own notification rules" ON public.notification_rules;

CREATE POLICY "Users can view their own notification rules" ON public.notification_rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification rules" ON public.notification_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification rules" ON public.notification_rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification rules" ON public.notification_rules
    FOR DELETE USING (auth.uid() = user_id);

-- Performance metrics policies
DROP POLICY IF EXISTS "Users can view performance metrics for their bookings" ON public.performance_metrics;
DROP POLICY IF EXISTS "Users can insert performance metrics for their bookings" ON public.performance_metrics;

CREATE POLICY "Users can view performance metrics for their bookings" ON public.performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = performance_metrics.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can insert performance metrics for their bookings" ON public.performance_metrics
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = performance_metrics.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Slack webhooks policies
DROP POLICY IF EXISTS "Users can view slack webhooks for their bookings" ON public.slack_webhooks;
DROP POLICY IF EXISTS "Users can manage slack webhooks for their bookings" ON public.slack_webhooks;

CREATE POLICY "Users can view slack webhooks for their bookings" ON public.slack_webhooks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = slack_webhooks.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage slack webhooks for their bookings" ON public.slack_webhooks
    FOR ALL USING (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = slack_webhooks.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- WhatsApp configs policies
DROP POLICY IF EXISTS "Users can view whatsapp configs for their bookings" ON public.whatsapp_configs;
DROP POLICY IF EXISTS "Users can manage whatsapp configs for their bookings" ON public.whatsapp_configs;

CREATE POLICY "Users can view whatsapp configs for their bookings" ON public.whatsapp_configs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = whatsapp_configs.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage whatsapp configs for their bookings" ON public.whatsapp_configs
    FOR ALL USING (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = whatsapp_configs.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Load test results policies
DROP POLICY IF EXISTS "Users can view load test results for their bookings" ON public.load_test_results;
DROP POLICY IF EXISTS "Users can manage load test results for their bookings" ON public.load_test_results;

CREATE POLICY "Users can view load test results for their bookings" ON public.load_test_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = load_test_results.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can manage load test results for their bookings" ON public.load_test_results
    FOR ALL USING (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = load_test_results.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- 10. Add comments
COMMENT ON TABLE public.notification_rules IS 'User notification preferences and rules for bookings';
COMMENT ON TABLE public.performance_metrics IS 'Performance tracking metrics for bookings and services';
COMMENT ON TABLE public.slack_webhooks IS 'Slack webhook configurations for booking notifications';
COMMENT ON TABLE public.whatsapp_configs IS 'WhatsApp configuration for booking notifications';
COMMENT ON TABLE public.load_test_results IS 'Load testing results and performance data for bookings';
COMMENT ON COLUMN public.audit_logs.entity_type IS 'Type of entity being audited (task, milestone, etc.)';
COMMENT ON COLUMN public.audit_logs.entity_id IS 'ID of the entity being audited';
COMMENT ON COLUMN public.audit_logs.user_name IS 'Name of the user who made the change';
COMMENT ON COLUMN public.audit_logs.user_email IS 'Email of the user who made the change';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional metadata for audit log entries';
COMMENT ON COLUMN public.audit_logs.booking_id IS 'ID of the booking this audit log entry is related to';
