-- Migration: Fix SECURITY DEFINER views to SECURITY INVOKER
-- Description: Convert all views from SECURITY DEFINER to SECURITY INVOKER to respect RLS policies
-- Date: 2025-01-02

-- This migration fixes the security issue where views were created with SECURITY DEFINER
-- which bypasses RLS policies. We'll convert them to SECURITY INVOKER so they respect
-- the caller's permissions and RLS policies.

-- 1. Fix booking dashboard stats view
CREATE OR REPLACE VIEW public.booking_dashboard_stats
SECURITY INVOKER
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

-- 2. Fix booking list enhanced view
CREATE OR REPLACE VIEW public.booking_list_enhanced
SECURITY INVOKER
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

-- 3. Fix booking list optimized view
CREATE OR REPLACE VIEW public.booking_list_optimized
SECURITY INVOKER
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
    
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    
    -- Service information
    s.title as service_title,
    s.category as service_category
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 4. Fix user enriched view
CREATE OR REPLACE VIEW public.user_enriched
SECURITY INVOKER
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

-- 5. Fix service enriched view
CREATE OR REPLACE VIEW public.service_enriched
SECURITY INVOKER
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

-- 6. Fix booking enriched view
CREATE OR REPLACE VIEW public.booking_enriched
SECURITY INVOKER
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

-- 7. Fix profiles with roles v2 view
CREATE OR REPLACE VIEW public.profiles_with_roles_v2
SECURITY INVOKER
AS
SELECT
  p.*,
  COALESCE(ur.role_name, 'client') as primary_role,
  ur.assigned_at as role_assigned_at,
  ur.is_active as role_is_active
FROM public.profiles p
LEFT JOIN public.user_roles_v2 ur ON p.id = ur.user_id AND ur.is_active = true;

-- 8. Fix profiles for bookings view
CREATE OR REPLACE VIEW public.profiles_for_bookings
SECURITY INVOKER
AS
SELECT 
    id,
    full_name,
    email,
    phone,
    role,
    is_verified,
    created_at
FROM public.profiles;

-- 9. Fix enhanced bookings view
CREATE OR REPLACE VIEW public.enhanced_bookings
SECURITY INVOKER
AS
SELECT 
    b.id,
    b.client_id,
    b.provider_id,
    b.service_id,
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
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    
    -- Service information
    s.title as service_title,
    s.category as service_category
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 10. Fix public services view
CREATE OR REPLACE VIEW public.public_services
SECURITY INVOKER
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

-- 11. Fix make.com bookings view
CREATE OR REPLACE VIEW public.make_com_bookings
SECURITY INVOKER
AS
SELECT 
    b.id,
    b.client_id,
    b.provider_id,
    b.service_id,
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
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    
    -- Service information
    s.title as service_title,
    s.category as service_category
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 12. Fix booking progress view
CREATE OR REPLACE VIEW public.booking_progress_view
SECURITY INVOKER
AS
SELECT 
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    
    -- Progress calculation
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN 50
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress_percentage,
    
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id;

-- 13. Fix v_milestone_progress view
CREATE OR REPLACE VIEW public.v_milestone_progress
SECURITY INVOKER
AS
SELECT 
    m.id,
    m.booking_id,
    m.title,
    m.description,
    m.status,
    m.due_date,
    m.created_at,
    m.updated_at,
    
    -- Progress calculation
    CASE 
        WHEN m.status = 'completed' THEN 100
        WHEN m.status = 'in_progress' THEN 50
        WHEN m.status = 'pending' THEN 0
        ELSE 0
    END as progress_percentage
    
FROM public.milestones m;

-- 14. Fix v_booking_progress view
CREATE OR REPLACE VIEW public.v_booking_progress
SECURITY INVOKER
AS
SELECT 
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    
    -- Progress calculation
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN 50
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress_percentage
    
FROM public.bookings b;

-- 15. Fix v_tasks_status view
CREATE OR REPLACE VIEW public.v_tasks_status
SECURITY INVOKER
AS
SELECT 
    t.id,
    t.milestone_id,
    t.title,
    t.description,
    t.status,
    t.due_date,
    t.created_at,
    t.updated_at,
    
    -- Overdue calculation
    CASE 
        WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN true
        ELSE false
    END as is_overdue
    
FROM public.tasks t;

-- 16. Fix v_bookings_kpis view
CREATE OR REPLACE VIEW public.v_bookings_kpis
SECURITY INVOKER
AS
SELECT
  current_date AS as_of_date,
  count(*)::int AS total_projects,
  count(*) FILTER (WHERE status IN ('pending_payment', 'paid', 'in_progress'))::int AS active_projects,
  count(*) FILTER (WHERE status = 'completed')::int AS completed_projects,
  count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_projects
FROM public.bookings;

-- 17. Fix v_bookings_monthly view
CREATE OR REPLACE VIEW public.v_bookings_monthly
SECURITY INVOKER
AS
WITH m AS (
  SELECT date_trunc('month', generated)::date AS month_start
  FROM generate_series((date_trunc('month', now()) - interval '5 months')::date, date_trunc('month', now())::date, interval '1 month') AS generated
)
SELECT 
  m.month_start,
  COALESCE(COUNT(b.id), 0)::int AS bookings_count,
  COALESCE(SUM(b.subtotal + b.vat_amount), 0)::numeric(12,3) AS total_revenue
FROM m
LEFT JOIN public.bookings b ON date_trunc('month', b.created_at)::date = m.month_start
GROUP BY m.month_start
ORDER BY m.month_start;

-- 18. Fix notification analytics view
CREATE OR REPLACE VIEW public.notification_analytics
SECURITY INVOKER
AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  type,
  COUNT(*) as count
FROM public.notifications
GROUP BY DATE_TRUNC('day', created_at), type
ORDER BY date DESC;

-- 19. Fix email notification analytics view
CREATE OR REPLACE VIEW public.email_notification_analytics
SECURITY INVOKER
AS
SELECT 
  enl.notification_type,
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE enl.sent_at IS NOT NULL) as sent_emails,
  COUNT(*) FILTER (WHERE enl.sent_at IS NULL) as pending_emails
FROM public.email_notification_logs enl
GROUP BY enl.notification_type;

-- 20. Fix bookings normalized view
CREATE OR REPLACE VIEW public.bookings_normalized
SECURITY INVOKER
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
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    
    -- Service information
    s.title as service_title,
    s.category as service_category
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public.booking_dashboard_stats TO authenticated;
GRANT SELECT ON public.booking_list_enhanced TO authenticated;
GRANT SELECT ON public.booking_list_optimized TO authenticated;
GRANT SELECT ON public.user_enriched TO authenticated;
GRANT SELECT ON public.service_enriched TO authenticated;
GRANT SELECT ON public.booking_enriched TO authenticated;
GRANT SELECT ON public.profiles_with_roles_v2 TO authenticated;
GRANT SELECT ON public.profiles_for_bookings TO authenticated;
GRANT SELECT ON public.enhanced_bookings TO authenticated;
GRANT SELECT ON public.public_services TO authenticated, anon;
GRANT SELECT ON public.make_com_bookings TO authenticated;
GRANT SELECT ON public.booking_progress_view TO authenticated;
GRANT SELECT ON public.v_milestone_progress TO authenticated;
GRANT SELECT ON public.v_booking_progress TO authenticated;
GRANT SELECT ON public.v_tasks_status TO authenticated;
GRANT SELECT ON public.v_bookings_kpis TO authenticated;
GRANT SELECT ON public.v_bookings_monthly TO authenticated;
GRANT SELECT ON public.notification_analytics TO authenticated;
GRANT SELECT ON public.email_notification_analytics TO authenticated;
GRANT SELECT ON public.bookings_normalized TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.booking_dashboard_stats IS 'Dashboard statistics view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.booking_list_enhanced IS 'Enhanced booking list view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.user_enriched IS 'User enriched view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.service_enriched IS 'Service enriched view with SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.booking_enriched IS 'Booking enriched view with SECURITY INVOKER to respect RLS policies';
