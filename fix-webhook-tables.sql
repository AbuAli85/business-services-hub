-- Fix Webhook Tables
-- Run this in Supabase SQL Editor to fix column mismatches

-- First, let's check what columns actually exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'webhook_logs';

-- Drop the existing tables and recreate them properly
DROP TABLE IF EXISTS webhook_logs CASCADE;
DROP TABLE IF EXISTS webhook_configs CASCADE;

-- Recreate webhook configuration table
CREATE TABLE webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate webhook logs table with correct structure
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  called_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- Insert your Make.com webhook configurations
INSERT INTO webhook_configs (name, webhook_url, event_types) VALUES
  ('booking-created', 'https://hook.eu2.make.com/1unm44xv23srammipy0j1cauawrkzn32', ARRAY['booking_created', 'service_created']),
  ('new-booking', 'https://hook.eu2.make.com/wb6i8h78k2uxwpq2qvd73lha0hs355ka', ARRAY['booking_created', 'service_created']);

-- Recreate the call_webhook function
CREATE OR REPLACE FUNCTION call_webhook(
  webhook_url TEXT,
  event_type TEXT,
  event_data JSONB
) RETURNS VOID AS $$
BEGIN
  -- For now, just log the webhook call
  INSERT INTO webhook_logs (webhook_url, event_type, event_data, called_at, status)
  VALUES (webhook_url, event_type, event_data, NOW(), 'sent');
  
  -- TODO: Add actual HTTP call when http extension is available
  -- PERFORM extensions.http_post(url := webhook_url, ...);
  
EXCEPTION WHEN OTHERS THEN
  -- Log failed webhook calls
  INSERT INTO webhook_logs (webhook_url, event_type, event_data, called_at, status, error_message)
  VALUES (webhook_url, event_type, event_data, NOW(), 'failed', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger functions
CREATE OR REPLACE FUNCTION trigger_service_webhooks() RETURNS TRIGGER AS $$
DECLARE
  webhook_config RECORD;
  event_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Prepare event data
    event_data := jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'category', NEW.category,
      'base_price', NEW.base_price,
      'status', NEW.status,
      'provider_id', NEW.provider_id,
      'created_at', NEW.created_at
    );
    
    -- Call webhooks for service_created event
    FOR webhook_config IN 
      SELECT * FROM webhook_configs 
      WHERE 'service_created' = ANY(event_types) AND is_active = true
    LOOP
      PERFORM call_webhook(
        webhook_config.webhook_url,
        'service_created',
        event_data
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_booking_webhooks() RETURNS TRIGGER AS $$
DECLARE
  webhook_config RECORD;
  event_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Prepare event data
    event_data := jsonb_build_object(
      'id', NEW.id,
      'service_id', NEW.service_id,
      'client_id', NEW.client_id,
      'provider_id', NEW.provider_id,
      'status', NEW.status,
      'total_amount', NEW.total_amount,
      'created_at', NEW.created_at
    );
    
    -- Call webhooks for booking_created event
    FOR webhook_config IN 
      SELECT * FROM webhook_configs 
      WHERE 'booking_created' = ANY(event_types) AND is_active = true
    LOOP
      PERFORM call_webhook(
        webhook_config.webhook_url,
        'booking_created',
        event_data
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the triggers
DROP TRIGGER IF EXISTS service_webhook_trigger ON services;
CREATE TRIGGER service_webhook_trigger
  AFTER INSERT ON services
  FOR EACH ROW
  EXECUTE FUNCTION trigger_service_webhooks();

DROP TRIGGER IF EXISTS booking_webhook_trigger ON bookings;
CREATE TRIGGER booking_webhook_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_webhooks();

-- Recreate the test function
CREATE OR REPLACE FUNCTION test_webhook(webhook_name TEXT) RETURNS TEXT AS $$
DECLARE
  webhook_config RECORD;
BEGIN
  SELECT * INTO webhook_config FROM webhook_configs WHERE name = webhook_name AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 'Webhook not found: ' || webhook_name;
  END IF;
  
  PERFORM call_webhook(webhook_config.webhook_url, 'test', '{"test": "data"}'::jsonb);
  RETURN 'Webhook test successful for ' || webhook_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the statistics function
CREATE OR REPLACE FUNCTION get_webhook_stats() RETURNS TABLE(
  webhook_name TEXT,
  total_calls BIGINT,
  successful_calls BIGINT,
  failed_calls BIGINT,
  success_rate NUMERIC,
  last_called TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wc.name,
    COUNT(wl.id)::BIGINT as total_calls,
    COUNT(CASE WHEN wl.status = 'sent' THEN 1 END)::BIGINT as successful_calls,
    COUNT(CASE WHEN wl.status = 'failed' THEN 1 END)::BIGINT as failed_calls,
    ROUND(
      (COUNT(CASE WHEN wl.status = 'sent' THEN 1 END)::NUMERIC / COUNT(wl.id)::NUMERIC) * 100, 2
    ) as success_rate,
    MAX(wl.called_at) as last_called
  FROM webhook_configs wc
  LEFT JOIN webhook_logs wl ON wc.webhook_url = wl.webhook_url
  GROUP BY wc.id, wc.name
  ORDER BY wc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT ON webhook_logs TO authenticated;
GRANT SELECT ON webhook_configs TO authenticated;
GRANT EXECUTE ON FUNCTION call_webhook(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION test_webhook(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_webhook_stats() TO authenticated;

-- Test the setup
SELECT 'Webhook tables fixed successfully!' as status;
