-- Direct SQL fix for RPC functions
-- Run this directly in your Supabase SQL editor

-- First, add missing columns to bookings table
DO $$
BEGIN
    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'title') THEN
        ALTER TABLE public.bookings ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column to bookings';
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'description') THEN
        ALTER TABLE public.bookings ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to bookings';
    END IF;
    
    -- Add start_time column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'start_time') THEN
        ALTER TABLE public.bookings ADD COLUMN start_time TIMESTAMPTZ;
        RAISE NOTICE 'Added start_time column to bookings';
    END IF;
    
    -- Add end_time column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'end_time') THEN
        ALTER TABLE public.bookings ADD COLUMN end_time TIMESTAMPTZ;
        RAISE NOTICE 'Added end_time column to bookings';
    END IF;
    
    RAISE NOTICE 'Bookings table columns updated successfully';
END $$;

-- Drop existing functions
DROP FUNCTION IF EXISTS get_provider_dashboard(uuid);
DROP FUNCTION IF EXISTS get_provider_recent_bookings(uuid, int);
DROP FUNCTION IF EXISTS get_provider_top_services(uuid, int);
DROP FUNCTION IF EXISTS get_provider_monthly_earnings(uuid, int);

-- Create fixed get_provider_dashboard function
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

-- Create fixed get_provider_recent_bookings function
CREATE OR REPLACE FUNCTION get_provider_recent_bookings(pid uuid, limit_count int)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  start_date text,
  end_date text,
  total_amount numeric,
  currency text,
  created_at text,
  client_name text,
  client_email text,
  service_title text,
  milestone_count bigint,
  completed_milestones bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    COALESCE(b.title, 'Untitled Booking')::text as title,
    COALESCE(b.description, '')::text as description,
    b.status::text,
    CASE 
      WHEN b.start_time IS NOT NULL THEN to_char(b.start_time, 'DD Mon YYYY')::text
      ELSE 'TBD'::text
    END as start_date,
    CASE 
      WHEN b.end_time IS NOT NULL THEN to_char(b.end_time, 'DD Mon YYYY')::text
      ELSE 'TBD'::text
    END as end_date,
    b.total_amount,
    b.currency::text,
    to_char(b.created_at, 'DD Mon YYYY')::text as created_at,
    COALESCE(c.full_name, 'Client')::text as client_name,
    COALESCE(au.email, 'client@example.com')::text as client_email,
    COALESCE(s.title, 'Service')::text as service_title,
    0::bigint as milestone_count, -- placeholder since milestones table doesn't exist yet
    0::bigint as completed_milestones -- placeholder since milestones table doesn't exist yet
  FROM bookings b
  LEFT JOIN profiles c ON b.client_id = c.id
  LEFT JOIN auth.users au ON c.id = au.id
  LEFT JOIN services s ON b.service_id = s.id
  WHERE b.provider_id = pid
  ORDER BY b.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create fixed get_provider_top_services function
CREATE OR REPLACE FUNCTION get_provider_top_services(pid uuid, limit_count int)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  currency text,
  status text,
  booking_count bigint,
  total_earnings numeric,
  avg_rating numeric,
  completion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title::text,
    COALESCE(s.description, '')::text as description,
    s.base_price as price,
    s.currency::text,
    s.status::text,
    COALESCE(booking_stats.booking_count, 0) as booking_count,
    COALESCE(booking_stats.total_earnings, 0) as total_earnings,
    COALESCE(rating_stats.avg_rating, 0) as avg_rating,
    COALESCE(completion_stats.completion_rate, 0) as completion_rate
  FROM services s
  LEFT JOIN (
    SELECT 
      service_id,
      COUNT(*) as booking_count,
      SUM(total_amount) as total_earnings
    FROM bookings
    WHERE provider_id = pid
    GROUP BY service_id
  ) booking_stats ON s.id = booking_stats.service_id
  LEFT JOIN (
    SELECT 
      b.service_id,
      AVG(r.rating) as avg_rating
    FROM reviews r
    JOIN bookings b ON r.booking_id = b.id
    WHERE b.provider_id = pid
    GROUP BY b.service_id
  ) rating_stats ON s.id = rating_stats.service_id
  LEFT JOIN (
    SELECT 
      service_id,
      (COUNT(*) FILTER (WHERE b6.status = 'completed')::decimal / GREATEST(COUNT(*), 1)) as completion_rate
    FROM bookings b6
    WHERE b6.provider_id = pid
    GROUP BY b6.service_id
  ) completion_stats ON s.id = completion_stats.service_id
  WHERE s.provider_id = pid
  ORDER BY COALESCE(booking_stats.booking_count, 0) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create fixed get_provider_monthly_earnings function
CREATE OR REPLACE FUNCTION get_provider_monthly_earnings(pid uuid, months_back int)
RETURNS TABLE (
  month_year text,
  earnings numeric,
  booking_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    to_char(date_trunc('month', b.created_at), 'Mon YYYY')::text as month_year,
    COALESCE(SUM(b.total_amount), 0) as earnings,
    COUNT(*) as booking_count
  FROM bookings b
  WHERE b.provider_id = pid
    AND b.created_at >= date_trunc('month', now() - interval '1 month' * months_back)
  GROUP BY date_trunc('month', b.created_at)
  ORDER BY date_trunc('month', b.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_provider_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_recent_bookings(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_top_services(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_monthly_earnings(uuid, int) TO authenticated;
