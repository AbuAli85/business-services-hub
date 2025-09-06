-- Quick fix for the dashboard function type mismatch
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS get_provider_dashboard(uuid);

CREATE OR REPLACE FUNCTION get_provider_dashboard(pid uuid)
RETURNS TABLE (
  total_earnings numeric,
  monthly_earnings numeric,
  active_bookings int,
  active_services int,
  avg_rating numeric,
  response_rate numeric,
  completion_rate numeric,
  monthly_growth numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(b.total_amount), 0) as total_earnings,
    COALESCE(SUM(b.total_amount) FILTER (WHERE date_trunc('month', b.created_at) = date_trunc('month', now())), 0) as monthly_earnings,
    (SELECT COUNT(*)::int FROM bookings b2 WHERE b2.provider_id = pid AND b2.status != 'cancelled') as active_bookings,
    (SELECT COUNT(*)::int FROM services s WHERE s.provider_id = pid AND s.status = 'active') as active_services,
    (SELECT AVG(r.rating) FROM reviews r JOIN bookings b3 ON r.booking_id = b3.id WHERE b3.provider_id = pid) as avg_rating,
    (SELECT (COUNT(*) FILTER (WHERE b4.status != 'pending')::decimal / GREATEST(COUNT(*), 1)) FROM bookings b4 WHERE b4.provider_id = pid) as response_rate,
    (SELECT (COUNT(*) FILTER (WHERE b5.status = 'completed')::decimal / GREATEST(COUNT(*), 1)) FROM bookings b5 WHERE b5.provider_id = pid) as completion_rate,
    0::numeric as monthly_growth -- placeholder for now
  FROM bookings b
  WHERE b.provider_id = pid;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_provider_dashboard(uuid) TO authenticated;
