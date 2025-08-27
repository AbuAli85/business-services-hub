-- Migration: Add Webhook Triggers for Make.com Integration
-- This migration sets up automatic webhook calls to Make.com when services or bookings are created

-- Enable the http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- Create a function to call Make.com webhooks
CREATE OR REPLACE FUNCTION call_make_com_webhook(
  webhook_url TEXT,
  event_type TEXT,
  event_data JSONB
) RETURNS VOID AS $$
BEGIN
  -- Call the Make.com webhook
  PERFORM extensions.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json"}'::JSONB,
    body := json_build_object(
      'event', event_type,
      'timestamp', NOW(),
      'data', event_data
    )::TEXT
  );
  
  -- Log the webhook call (optional)
  INSERT INTO webhook_logs (webhook_url, event_type, event_data, called_at, delivery_status)
  VALUES (webhook_url, event_type, event_data, NOW(), 'sent');
  
EXCEPTION WHEN OTHERS THEN
  -- Log failed webhook calls
  INSERT INTO webhook_logs (webhook_url, event_type, event_data, called_at, delivery_status, error_message)
  VALUES (webhook_url, event_type, event_data, NOW(), 'failed', SQLERRM);
  
  -- Re-raise the error
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create webhook configuration table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook logs table for monitoring
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  called_at TIMESTAMPTZ NOT NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('sent', 'failed')),
  error_message TEXT,
  response_status INTEGER,
  response_body TEXT
);

-- Insert default Make.com webhook configurations
INSERT INTO webhook_configs (name, webhook_url, event_types) VALUES
  ('booking-created', 'https://hook.eu2.make.com/1unm44xv23srammipy0j1cauawrkzn32', ARRAY['booking_created', 'service_created']),
  ('new-booking', 'https://hook.eu2.make.com/wb6i8h78k2uxwpq2qvd73lha0hs355ka', ARRAY['booking_created', 'service_created'])
ON CONFLICT (name) DO UPDATE SET
  webhook_url = EXCLUDED.webhook_url,
  event_types = EXCLUDED.event_types,
  updated_at = NOW();

-- Create function to trigger webhooks for service creation
CREATE OR REPLACE FUNCTION trigger_service_webhooks() RETURNS TRIGGER AS $$
DECLARE
  webhook_config RECORD;
  event_data JSONB;
BEGIN
  -- Only trigger on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Prepare event data
    event_data := jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'category', NEW.category,
      'base_price', NEW.base_price,
      'currency', NEW.currency,
      'status', NEW.status,
      'provider_id', NEW.provider_id,
      'created_at', NEW.created_at
    );
    
    -- Call webhooks for service_created event
    FOR webhook_config IN 
      SELECT * FROM webhook_configs 
      WHERE 'service_created' = ANY(event_types) AND is_active = true
    LOOP
      PERFORM call_make_com_webhook(
        webhook_config.webhook_url,
        'service_created',
        event_data
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to trigger webhooks for booking creation
CREATE OR REPLACE FUNCTION trigger_booking_webhooks() RETURNS TRIGGER AS $$
DECLARE
  webhook_config RECORD;
  event_data JSONB;
BEGIN
  -- Only trigger on INSERT
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
      PERFORM call_make_com_webhook(
        webhook_config.webhook_url,
        'booking_created',
        event_data
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_called_at ON webhook_logs(called_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_delivery_status ON webhook_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(is_active);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT EXECUTE ON FUNCTION call_make_com_webhook(UUID, TEXT, JSONB) TO authenticated;
GRANT SELECT, INSERT ON webhook_logs TO authenticated;
GRANT SELECT ON webhook_configs TO authenticated;

-- Create a function to manually test webhooks
CREATE OR REPLACE FUNCTION test_webhook(webhook_name TEXT, event_type TEXT, test_data JSONB DEFAULT '{}'::JSONB) RETURNS TEXT AS $$
DECLARE
  webhook_config RECORD;
  result TEXT;
BEGIN
  -- Get webhook configuration
  SELECT * INTO webhook_config FROM webhook_configs WHERE name = webhook_name AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN 'Webhook not found or inactive: ' || webhook_name;
  END IF;
  
  -- Test the webhook
  BEGIN
    PERFORM call_make_com_webhook(webhook_config.webhook_url, event_type, test_data);
    result := 'Webhook test successful for ' || webhook_name;
  EXCEPTION WHEN OTHERS THEN
    result := 'Webhook test failed for ' || webhook_name || ': ' || SQLERRM;
  END;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for testing
GRANT EXECUTE ON FUNCTION test_webhook(TEXT, TEXT, JSONB) TO authenticated;

-- Create a function to get webhook statistics
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
    COUNT(CASE WHEN wl.delivery_status = 'sent' THEN 1 END)::BIGINT as successful_calls,
    COUNT(CASE WHEN wl.delivery_status = 'failed' THEN 1 END)::BIGINT as failed_calls,
    ROUND(
      (COUNT(CASE WHEN wl.delivery_status = 'sent' THEN 1 END)::NUMERIC / COUNT(wl.id)::NUMERIC) * 100, 2
    ) as success_rate,
    MAX(wl.called_at) as last_called
  FROM webhook_configs wc
  LEFT JOIN webhook_logs wl ON wc.webhook_url = wl.webhook_url
  GROUP BY wc.id, wc.name
  ORDER BY wc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for statistics
GRANT EXECUTE ON FUNCTION get_webhook_stats() TO authenticated;
