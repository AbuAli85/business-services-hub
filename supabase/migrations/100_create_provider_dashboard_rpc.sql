-- Create RPC function for provider dashboard stats
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
    (SELECT COUNT(*) FROM bookings b WHERE b.provider_id = pid AND b.status != 'cancelled') as active_bookings,
    (SELECT COUNT(*) FROM services s WHERE s.provider_id = pid AND s.status = 'active') as active_services,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.provider_id = pid) as avg_rating,
    (SELECT (COUNT(*) FILTER (WHERE responded_at IS NOT NULL)::decimal / GREATEST(COUNT(*), 1)) FROM bookings b WHERE b.provider_id = pid) as response_rate,
    (SELECT (COUNT(*) FILTER (WHERE status = 'completed')::decimal / GREATEST(COUNT(*), 1)) FROM bookings b WHERE b.provider_id = pid) as completion_rate,
    0 as monthly_growth -- placeholder for now
  FROM bookings b
  WHERE b.provider_id = pid;
END;
$$ LANGUAGE plpgsql;

-- Create function to get recent bookings for provider
CREATE OR REPLACE FUNCTION get_provider_recent_bookings(pid uuid, limit_count int DEFAULT 10)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  start_date date,
  end_date date,
  total_amount numeric,
  currency text,
  created_at timestamp with time zone,
  client_name text,
  client_email text,
  service_title text,
  milestone_count int,
  completed_milestones int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.description,
    b.status,
    b.start_date,
    b.end_date,
    b.total_amount,
    b.currency,
    b.created_at,
    p.full_name as client_name,
    p.email as client_email,
    s.title as service_title,
    COALESCE(milestone_stats.total_milestones, 0) as milestone_count,
    COALESCE(milestone_stats.completed_milestones, 0) as completed_milestones
  FROM bookings b
  LEFT JOIN profiles p ON b.client_id = p.id
  LEFT JOIN services s ON b.service_id = s.id
  LEFT JOIN (
    SELECT 
      m.booking_id,
      COUNT(*) as total_milestones,
      COUNT(*) FILTER (WHERE m.status = 'completed') as completed_milestones
    FROM milestones m
    GROUP BY m.booking_id
  ) milestone_stats ON b.id = milestone_stats.booking_id
  WHERE b.provider_id = pid
  ORDER BY b.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get top performing services
CREATE OR REPLACE FUNCTION get_provider_top_services(pid uuid, limit_count int DEFAULT 5)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  currency text,
  status text,
  booking_count int,
  total_earnings numeric,
  avg_rating numeric,
  completion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.description,
    s.price,
    s.currency,
    s.status,
    COALESCE(booking_stats.booking_count, 0) as booking_count,
    COALESCE(booking_stats.total_earnings, 0) as total_earnings,
    COALESCE(rating_stats.avg_rating, 0) as avg_rating,
    COALESCE(booking_stats.completion_rate, 0) as completion_rate
  FROM services s
  LEFT JOIN (
    SELECT 
      b.service_id,
      COUNT(*) as booking_count,
      SUM(b.total_amount) as total_earnings,
      (COUNT(*) FILTER (WHERE b.status = 'completed')::decimal / GREATEST(COUNT(*), 1)) as completion_rate
    FROM bookings b
    WHERE b.provider_id = pid
    GROUP BY b.service_id
  ) booking_stats ON s.id = booking_stats.service_id
  LEFT JOIN (
    SELECT 
      r.service_id,
      AVG(r.rating) as avg_rating
    FROM reviews r
    WHERE r.provider_id = pid
    GROUP BY r.service_id
  ) rating_stats ON s.id = rating_stats.service_id
  WHERE s.provider_id = pid
  ORDER BY booking_stats.booking_count DESC NULLS LAST, booking_stats.total_earnings DESC NULLS LAST
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get monthly earnings data
CREATE OR REPLACE FUNCTION get_provider_monthly_earnings(pid uuid, months_back int DEFAULT 12)
RETURNS TABLE (
  month_year text,
  earnings numeric,
  booking_count int
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(date_trunc('month', b.created_at), 'Mon YYYY') as month_year,
    COALESCE(SUM(b.total_amount), 0) as earnings,
    COUNT(*) as booking_count
  FROM bookings b
  WHERE b.provider_id = pid
    AND b.created_at >= date_trunc('month', now() - interval '1 month' * months_back)
  GROUP BY date_trunc('month', b.created_at)
  ORDER BY date_trunc('month', b.created_at);
END;
$$ LANGUAGE plpgsql;
