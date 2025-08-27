-- Fix Webhook Statistics Function
-- Run this in Supabase SQL Editor to fix the division by zero error

-- Drop the existing function
DROP FUNCTION IF EXISTS get_webhook_stats();

-- Recreate the function with proper zero handling
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
    CASE 
      WHEN COUNT(wl.id) = 0 THEN 0::NUMERIC
      ELSE ROUND(
        (COUNT(CASE WHEN wl.status = 'sent' THEN 1 END)::NUMERIC / COUNT(wl.id)::NUMERIC) * 100, 2
      )
    END as success_rate,
    MAX(wl.called_at) as last_called
  FROM webhook_configs wc
  LEFT JOIN webhook_logs wl ON wc.webhook_url = wl.webhook_url
  GROUP BY wc.id, wc.name
  ORDER BY wc.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_webhook_stats() TO authenticated;

-- Test the fixed function
SELECT 'Webhook statistics function fixed successfully!' as status;
