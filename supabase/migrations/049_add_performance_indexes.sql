-- Migration: Add Performance Indexes and Materialized Views
-- Description: Add database indexes and materialized views for better performance
-- Date: 2024-12-19

-- Performance indexes for services table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_status 
ON services(provider_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_category_status 
ON services(category, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_created_at 
ON services(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_price_range 
ON services(base_price, currency);

-- Performance indexes for bookings table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_dates 
ON bookings(status, created_at, scheduled_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_client_provider 
ON bookings(client_id, provider_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_payment_status 
ON bookings(payment_status, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_approval_status 
ON bookings(approval_status, operational_status);

-- Performance indexes for messages table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation 
ON messages(sender_id, receiver_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_booking 
ON messages(booking_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_read_status 
ON messages(read, created_at);

-- Performance indexes for notifications table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_type 
ON notifications(user_id, type, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_priority 
ON notifications(priority, created_at);

-- Performance indexes for payments table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_booking_status 
ON payments(booking_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_stripe_intent 
ON payments(stripe_payment_intent_id);

-- Performance indexes for profiles table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role 
ON profiles(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_company 
ON profiles(company_name);

-- Performance indexes for companies table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_owner 
ON companies(owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_industry 
ON companies(industry);

-- Materialized view for service analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS service_analytics AS
SELECT 
  s.id,
  s.title,
  s.category,
  s.provider_id,
  s.base_price,
  s.currency,
  s.status,
  s.created_at,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  AVG(b.rating) as avg_rating,
  SUM(CASE WHEN b.payment_status = 'paid' THEN b.amount ELSE 0 END) as total_revenue,
  s.views_count,
  s.bookings_count
FROM services s
LEFT JOIN bookings b ON s.id = b.service_id
GROUP BY s.id, s.title, s.category, s.provider_id, s.base_price, s.currency, s.status, s.created_at, s.views_count, s.bookings_count;

-- Materialized view for user analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS user_analytics AS
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.company_name,
  p.created_at,
  COUNT(DISTINCT s.id) as total_services,
  COUNT(DISTINCT b.id) as total_bookings,
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
  SUM(CASE WHEN b.payment_status = 'paid' THEN b.amount ELSE 0 END) as total_spent,
  AVG(b.rating) as avg_rating
FROM profiles p
LEFT JOIN services s ON p.id = s.provider_id
LEFT JOIN bookings b ON (p.id = b.client_id OR p.id = b.provider_id)
GROUP BY p.id, p.full_name, p.role, p.company_name, p.created_at;

-- Materialized view for booking analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS booking_analytics AS
SELECT 
  DATE_TRUNC('day', b.created_at) as date,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COUNT(CASE WHEN b.payment_status = 'paid' THEN 1 END) as paid_bookings,
  SUM(CASE WHEN b.payment_status = 'paid' THEN b.amount ELSE 0 END) as total_revenue,
  AVG(b.rating) as avg_rating
FROM bookings b
GROUP BY DATE_TRUNC('day', b.created_at)
ORDER BY date DESC;

-- Create indexes on materialized views
CREATE INDEX IF NOT EXISTS idx_service_analytics_provider ON service_analytics(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_analytics_category ON service_analytics(category);
CREATE INDEX IF NOT EXISTS idx_user_analytics_role ON user_analytics(role);
CREATE INDEX IF NOT EXISTS idx_booking_analytics_date ON booking_analytics(date);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY service_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY booking_analytics;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON service_analytics TO authenticated;
GRANT SELECT ON user_analytics TO authenticated;
GRANT SELECT ON booking_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_analytics_views() TO service_role;

-- Create a scheduled job to refresh views (if using pg_cron extension)
-- SELECT cron.schedule('refresh-analytics', '0 */6 * * *', 'SELECT refresh_analytics_views();');

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW service_analytics IS 'Aggregated service performance metrics for analytics';
COMMENT ON MATERIALIZED VIEW user_analytics IS 'Aggregated user performance metrics for analytics';
COMMENT ON MATERIALIZED VIEW booking_analytics IS 'Daily booking metrics for trend analysis';
COMMENT ON FUNCTION refresh_analytics_views() IS 'Refreshes all analytics materialized views';
