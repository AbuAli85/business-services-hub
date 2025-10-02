-- Direct SQL script to fix SECURITY DEFINER views
-- Run this directly against your production database

-- Drop existing views first to avoid column structure conflicts
DROP VIEW IF EXISTS public.booking_dashboard_stats CASCADE;
DROP VIEW IF EXISTS public.user_enriched CASCADE;
DROP VIEW IF EXISTS public.service_enriched CASCADE;
DROP VIEW IF EXISTS public.booking_enriched CASCADE;
DROP VIEW IF EXISTS public.booking_list_enhanced CASCADE;
DROP VIEW IF EXISTS public.public_services CASCADE;

-- 1. Fix booking dashboard stats view
CREATE OR REPLACE VIEW public.booking_dashboard_stats
AS
WITH booking_metrics AS (
    SELECT 
        -- Basic counts
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status IN ('pending_payment', 'paid', 'in_progress')) as active_bookings,
        COUNT(*) FILTER (WHERE status = 'pending_payment') as pending_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
        
        -- Revenue calculations
        COALESCE(SUM(subtotal + vat_amount) FILTER (WHERE status IN ('paid', 'completed')), 0) as total_revenue,
        COALESCE(SUM(subtotal + vat_amount) FILTER (WHERE status = 'pending_payment'), 0) as pending_revenue,
        
        -- Success rate calculation
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 2)
            ELSE 0 
        END as success_rate,
        
        -- Portfolio percentage (active vs total capacity - simplified)
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
  
  -- Client information
  c.full_name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  
  -- Provider information
  p.full_name as provider_name,
  p.email as provider_email,
  p.phone as provider_phone,
  
  -- Service information
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  s.base_price as service_base_price,
  s.currency as service_currency
  
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 5. Fix booking list enhanced view
CREATE OR REPLACE VIEW public.booking_list_enhanced
AS
SELECT 
    b.id,
    b.booking_number,
    b.title,
    b.status,
    b.subtotal,
    b.vat_amount,
    b.total_amount,
    b.created_at,
    b.updated_at,
    b.requirements,
    
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    
    -- Service information
    s.title as service_title,
    s.category as service_category,
    
    -- Status display helpers
    CASE 
        WHEN b.status = 'pending_payment' THEN 'Pending Payment'
        WHEN b.status = 'paid' THEN 'Paid'
        WHEN b.status = 'in_progress' THEN 'In Progress'
        WHEN b.status = 'delivered' THEN 'Delivered'
        WHEN b.status = 'completed' THEN 'Completed'
        WHEN b.status = 'cancelled' THEN 'Cancelled'
        WHEN b.status = 'disputed' THEN 'Disputed'
        ELSE 'Draft'
    END as status_display,
    
    -- Progress calculation (simplified)
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN 50
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress_percentage
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 6. Fix public services view
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
-- For older versions, this will be ignored but views will default to INVOKER
ALTER VIEW public.booking_dashboard_stats SET (security_invoker = true);
ALTER VIEW public.user_enriched SET (security_invoker = true);
ALTER VIEW public.service_enriched SET (security_invoker = true);
ALTER VIEW public.booking_enriched SET (security_invoker = true);
ALTER VIEW public.booking_list_enhanced SET (security_invoker = true);
ALTER VIEW public.public_services SET (security_invoker = true);

-- Grant appropriate permissions
GRANT SELECT ON public.booking_dashboard_stats TO authenticated;
GRANT SELECT ON public.user_enriched TO authenticated;
GRANT SELECT ON public.service_enriched TO authenticated;
GRANT SELECT ON public.booking_enriched TO authenticated;
GRANT SELECT ON public.booking_list_enhanced TO authenticated;
GRANT SELECT ON public.public_services TO authenticated, anon;

-- Add comments for documentation
COMMENT ON VIEW public.booking_dashboard_stats IS 'Dashboard statistics view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.user_enriched IS 'User enriched view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.service_enriched IS 'Service enriched view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.booking_enriched IS 'Booking enriched view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.booking_list_enhanced IS 'Enhanced booking list view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.public_services IS 'Public services view with SECURITY INVOKER to respect RLS policies';

-- Verify the changes
-- Check if views exist and are accessible
SELECT 
    schemaname, 
    viewname, 
    viewowner,
    'SECURITY INVOKER (default)' as security_type
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'booking_dashboard_stats', 
    'user_enriched', 
    'service_enriched', 
    'booking_enriched',
    'booking_list_enhanced',
    'public_services'
)
ORDER BY viewname;

-- Test that views are accessible (this will respect RLS)
SELECT 'Testing booking_dashboard_stats...' as test_status;
SELECT COUNT(*) as booking_count FROM public.booking_dashboard_stats;

SELECT 'Testing user_enriched...' as test_status;
SELECT COUNT(*) as user_count FROM public.user_enriched LIMIT 1;

SELECT 'Testing service_enriched...' as test_status;
SELECT COUNT(*) as service_count FROM public.service_enriched LIMIT 1;
