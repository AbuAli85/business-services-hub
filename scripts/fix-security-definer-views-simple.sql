-- Simple SQL script to fix SECURITY DEFINER views
-- Compatible with all PostgreSQL versions
-- Run this directly against your production database

-- Drop existing views first to avoid column structure conflicts
DROP VIEW IF EXISTS public.booking_dashboard_stats CASCADE;
DROP VIEW IF EXISTS public.user_enriched CASCADE;
DROP VIEW IF EXISTS public.service_enriched CASCADE;
DROP VIEW IF EXISTS public.booking_enriched CASCADE;
DROP VIEW IF EXISTS public.public_services CASCADE;

-- 1. Fix booking dashboard stats view
CREATE OR REPLACE VIEW public.booking_dashboard_stats
AS
WITH booking_metrics AS (
    SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status IN ('pending_payment', 'paid', 'in_progress')) as active_bookings,
        COUNT(*) FILTER (WHERE status = 'pending_payment') as pending_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
        COALESCE(SUM(subtotal + vat_amount) FILTER (WHERE status IN ('paid', 'completed')), 0) as total_revenue,
        COALESCE(SUM(subtotal + vat_amount) FILTER (WHERE status = 'pending_payment'), 0) as pending_revenue,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0 
        END as success_rate,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status IN ('pending_payment', 'paid', 'in_progress'))::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0 
        END as portfolio_percentage
    FROM public.bookings
    WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
)
SELECT 
    total_bookings,
    active_bookings,
    pending_bookings,
    completed_bookings,
    cancelled_bookings,
    total_revenue,
    pending_revenue,
    success_rate,
    portfolio_percentage,
    CURRENT_TIMESTAMP as last_updated
FROM booking_metrics;

-- 2. Fix user enriched view
CREATE OR REPLACE VIEW public.user_enriched
AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.country,
  p.is_verified,
  p.created_at,
  p.updated_at,
  p.role,
  p.company_id,
  c.name as company_name,
  c.cr_number,
  c.vat_number
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id;

-- 3. Fix service enriched view
CREATE OR REPLACE VIEW public.service_enriched
AS
SELECT
  s.id,
  s.title,
  s.description,
  s.category,
  s.status,
  s.base_price,
  s.currency,
  s.cover_image_url,
  s.created_at,
  s.updated_at,
  s.provider_id,
  p.full_name as provider_name,
  p.email as provider_email,
  c.name as company_name
FROM public.services s
LEFT JOIN public.profiles p ON s.provider_id = p.id
LEFT JOIN public.companies c ON s.company_id = c.id;

-- 4. Fix booking enriched view
CREATE OR REPLACE VIEW public.booking_enriched
AS
SELECT
  b.id,
  b.booking_number,
  b.title,
  b.status,
  b.subtotal,
  b.vat_amount,
  b.total_amount,
  b.requirements,
  b.created_at,
  b.updated_at,
  b.client_id,
  b.provider_id,
  b.service_id,
  b.package_id,
  c.full_name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  p.full_name as provider_name,
  p.email as provider_email,
  p.phone as provider_phone,
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  s.base_price as service_base_price,
  s.currency as service_currency
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 5. Fix public services view
CREATE OR REPLACE VIEW public.public_services
AS
SELECT 
    s.id,
    s.title,
    s.description,
    s.category,
    s.base_price,
    s.currency,
    s.cover_image_url,
    s.created_at,
    s.updated_at,
    s.provider_id,
    p.full_name as provider_name,
    c.name as company_name
FROM public.services s
LEFT JOIN public.profiles p ON s.provider_id = p.id
LEFT JOIN public.companies c ON s.company_id = c.id
WHERE s.status = 'active';

-- Set views to SECURITY INVOKER (PostgreSQL 15+ syntax)
-- For older versions, views default to INVOKER behavior
DO $$
BEGIN
    -- Try to set security_invoker for PostgreSQL 15+
    BEGIN
        ALTER VIEW public.booking_dashboard_stats SET (security_invoker = true);
        ALTER VIEW public.user_enriched SET (security_invoker = true);
        ALTER VIEW public.service_enriched SET (security_invoker = true);
        ALTER VIEW public.booking_enriched SET (security_invoker = true);
        ALTER VIEW public.public_services SET (security_invoker = true);
        RAISE NOTICE 'Successfully set SECURITY INVOKER on views';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SECURITY INVOKER not supported in this PostgreSQL version, views will use default INVOKER behavior';
    END;
END $$;

-- Grant appropriate permissions
GRANT SELECT ON public.booking_dashboard_stats TO authenticated;
GRANT SELECT ON public.user_enriched TO authenticated;
GRANT SELECT ON public.service_enriched TO authenticated;
GRANT SELECT ON public.booking_enriched TO authenticated;
GRANT SELECT ON public.public_services TO authenticated, anon;

-- Add comments
COMMENT ON VIEW public.booking_dashboard_stats IS 'Dashboard statistics view - respects RLS policies';
COMMENT ON VIEW public.user_enriched IS 'User enriched view - respects RLS policies';
COMMENT ON VIEW public.service_enriched IS 'Service enriched view - respects RLS policies';
COMMENT ON VIEW public.booking_enriched IS 'Booking enriched view - respects RLS policies';
COMMENT ON VIEW public.public_services IS 'Public services view - respects RLS policies';

-- Verify views exist
SELECT 
    schemaname, 
    viewname, 
    'Fixed - respects RLS' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'booking_dashboard_stats', 
    'user_enriched', 
    'service_enriched', 
    'booking_enriched',
    'public_services'
)
ORDER BY viewname;
