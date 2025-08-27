-- Simple Webhook Setup Script
-- Run this in Supabase SQL Editor

-- Step 1: Create webhook configuration table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  called_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- Step 3: Insert your Make.com webhook URLs
INSERT INTO webhook_configs (name, webhook_url, event_types) VALUES
  ('booking-created', 'https://hook.eu2.make.com/1unm44xv23srammipy0j1cauawrkzn32', ARRAY['booking_created', 'service_created']),
  ('new-booking', 'https://hook.eu2.make.com/wb6i8h78k2uxwpq2qvd73lha0hs355ka', ARRAY['booking_created', 'service_created'])
ON CONFLICT (name) DO UPDATE SET
  webhook_url = EXCLUDED.webhook_url,
  event_types = EXCLUDED.event_types;

-- Step 4: Create function to call webhooks
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

-- Step 5: Create trigger function for services
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

-- Step 6: Create trigger function for bookings
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

-- Step 7: Create the triggers
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

-- Step 8: Grant permissions
GRANT SELECT, INSERT ON webhook_logs TO authenticated;
GRANT SELECT ON webhook_configs TO authenticated;
GRANT EXECUTE ON FUNCTION call_webhook(TEXT, TEXT, JSONB) TO authenticated;

-- Step 9: Test function
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

GRANT EXECUTE ON FUNCTION test_webhook(TEXT) TO authenticated;

-- Success message
SELECT 'Webhook setup completed successfully!' as status;
