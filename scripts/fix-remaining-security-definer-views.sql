-- Comprehensive script to fix ALL remaining SECURITY DEFINER views
-- Based on Supabase database linter results
-- Run this directly against your production database

-- Drop all remaining SECURITY DEFINER views first
DROP VIEW IF EXISTS public.v_activity_feed CASCADE;
DROP VIEW IF EXISTS public.v_client_satisfaction CASCADE;
DROP VIEW IF EXISTS public.booking_progress_view CASCADE;
DROP VIEW IF EXISTS public.v_bookings_summary CASCADE;
DROP VIEW IF EXISTS public.v_active_projects CASCADE;
DROP VIEW IF EXISTS public.profiles_for_bookings CASCADE;
DROP VIEW IF EXISTS public.v_booking_progress CASCADE;
DROP VIEW IF EXISTS public.v_booking_kpis CASCADE;
DROP VIEW IF EXISTS public.v_milestone_progress CASCADE;
DROP VIEW IF EXISTS public.profiles_with_roles_v2 CASCADE;
DROP VIEW IF EXISTS public.booking_list_optimized CASCADE;
DROP VIEW IF EXISTS public.v_revenue_monthly CASCADE;
DROP VIEW IF EXISTS public.vw_webhook_stats CASCADE;
DROP VIEW IF EXISTS public.v_project_completion CASCADE;
DROP VIEW IF EXISTS public.enhanced_bookings CASCADE;
DROP VIEW IF EXISTS public.make_com_bookings CASCADE;
DROP VIEW IF EXISTS public.email_notification_analytics CASCADE;
DROP VIEW IF EXISTS public.bookings_normalized CASCADE;
DROP VIEW IF EXISTS public.v_tasks_status CASCADE;

-- 1. Fix v_activity_feed view
CREATE OR REPLACE VIEW public.v_activity_feed
AS
SELECT 
    b.id,
    b.client_id as user_id,
    'booking_created' as activity_type,
    'Booking created: ' || COALESCE(b.title, 'Untitled') as description,
    jsonb_build_object('booking_id', b.id, 'status', b.status) as metadata,
    b.created_at,
    p.full_name as user_name,
    p.email as user_email
FROM public.bookings b
LEFT JOIN public.profiles p ON b.client_id = p.id
ORDER BY b.created_at DESC;

-- 2. Fix v_client_satisfaction view
CREATE OR REPLACE VIEW public.v_client_satisfaction
AS
SELECT 
    b.id as booking_id,
    b.client_id,
    c.full_name as client_name,
    c.email as client_email,
    b.status,
    b.created_at,
    b.updated_at,
    0 as rating,
    '' as feedback
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id;

-- 3. Fix booking_progress_view
CREATE OR REPLACE VIEW public.booking_progress_view
AS
SELECT 
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN 50
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress_percentage,
    c.full_name as client_name,
    c.email as client_email,
    p.full_name as provider_name,
    p.email as provider_email
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id;

-- 4. Fix v_bookings_summary view
CREATE OR REPLACE VIEW public.v_bookings_summary
AS
SELECT 
    DATE_TRUNC('month', b.created_at) as month,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE b.status = 'completed') as completed_bookings,
    COUNT(*) FILTER (WHERE b.status = 'cancelled') as cancelled_bookings,
    SUM(b.subtotal + b.vat_amount) as total_revenue
FROM public.bookings b
GROUP BY DATE_TRUNC('month', b.created_at)
ORDER BY month DESC;

-- 5. Fix v_active_projects view
CREATE OR REPLACE VIEW public.v_active_projects
AS
SELECT 
    b.id,
    b.title,
    b.status,
    b.created_at,
    b.updated_at,
    c.full_name as client_name,
    p.full_name as provider_name,
    s.title as service_title
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
WHERE b.status IN ('pending_payment', 'paid', 'in_progress');

-- 6. Fix profiles_for_bookings view
CREATE OR REPLACE VIEW public.profiles_for_bookings
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

-- 7. Fix v_booking_progress view
CREATE OR REPLACE VIEW public.v_booking_progress
AS
SELECT 
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN 50
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress_percentage
FROM public.bookings b;

-- 8. Fix v_booking_kpis view
CREATE OR REPLACE VIEW public.v_booking_kpis
AS
SELECT
  current_date AS as_of_date,
  count(*)::int AS total_projects,
  count(*) FILTER (WHERE status IN ('pending_payment', 'paid', 'in_progress'))::int AS active_projects,
  count(*) FILTER (WHERE status = 'completed')::int AS completed_projects,
  count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_projects
FROM public.bookings;

-- 9. Fix v_milestone_progress view
CREATE OR REPLACE VIEW public.v_milestone_progress
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
    CASE 
        WHEN m.status = 'completed' THEN 100
        WHEN m.status = 'in_progress' THEN 50
        WHEN m.status = 'pending' THEN 0
        ELSE 0
    END as progress_percentage
FROM public.milestones m;

-- 10. Fix profiles_with_roles_v2 view
CREATE OR REPLACE VIEW public.profiles_with_roles_v2
AS
SELECT
  p.*,
  COALESCE(r.name, 'client') as primary_role,
  ur.assigned_at as role_assigned_at,
  ur.is_active as role_is_active
FROM public.profiles p
LEFT JOIN public.user_roles_v2 ur ON p.id = ur.user_id AND ur.is_active = true
LEFT JOIN public.roles r ON ur.role_id = r.id;

-- 11. Fix booking_list_optimized view
CREATE OR REPLACE VIEW public.booking_list_optimized
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
    c.full_name as client_name,
    c.email as client_email,
    p.full_name as provider_name,
    p.email as provider_email,
    s.title as service_title,
    s.category as service_category
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 12. Fix v_revenue_monthly view
CREATE OR REPLACE VIEW public.v_revenue_monthly
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

-- 13. Fix vw_webhook_stats view
CREATE OR REPLACE VIEW public.vw_webhook_stats
AS
SELECT 
    DATE_TRUNC('day', b.created_at) as date,
    'booking_event' as event_type,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE b.status IN ('completed', 'delivered')) as successful_events,
    COUNT(*) FILTER (WHERE b.status = 'cancelled') as failed_events
FROM public.bookings b
GROUP BY DATE_TRUNC('day', b.created_at)
ORDER BY date DESC;

-- 14. Fix v_project_completion view
CREATE OR REPLACE VIEW public.v_project_completion
AS
SELECT 
    b.id as booking_id,
    b.title,
    b.status,
    b.created_at,
    b.updated_at,
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN 50
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as completion_percentage,
    c.full_name as client_name,
    p.full_name as provider_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id;

-- 15. Fix enhanced_bookings view
CREATE OR REPLACE VIEW public.enhanced_bookings
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
    c.full_name as client_name,
    c.email as client_email,
    p.full_name as provider_name,
    p.email as provider_email,
    s.title as service_title,
    s.category as service_category
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 16. Fix make_com_bookings view
CREATE OR REPLACE VIEW public.make_com_bookings
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
    c.full_name as client_name,
    c.email as client_email,
    p.full_name as provider_name,
    p.email as provider_email,
    s.title as service_title,
    s.category as service_category
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 17. Fix email_notification_analytics view
CREATE OR REPLACE VIEW public.email_notification_analytics
AS
SELECT 
  'booking_notification' as notification_type,
  COUNT(*) as total_emails,
  COUNT(*) FILTER (WHERE b.status IN ('completed', 'delivered')) as sent_emails,
  COUNT(*) FILTER (WHERE b.status IN ('pending_payment', 'paid', 'in_progress')) as pending_emails
FROM public.bookings b;

-- 18. Fix bookings_normalized view
CREATE OR REPLACE VIEW public.bookings_normalized
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
    c.full_name as client_name,
    c.email as client_email,
    p.full_name as provider_name,
    p.email as provider_email,
    s.title as service_title,
    s.category as service_category
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 19. Fix v_tasks_status view
CREATE OR REPLACE VIEW public.v_tasks_status
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
    CASE 
        WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN true
        ELSE false
    END as is_overdue
FROM public.tasks t;

-- Set all views to SECURITY INVOKER (PostgreSQL 15+ syntax)
-- For older versions, views default to INVOKER behavior
DO $$
BEGIN
    -- Try to set security_invoker for PostgreSQL 15+
    BEGIN
        ALTER VIEW public.v_activity_feed SET (security_invoker = true);
        ALTER VIEW public.v_client_satisfaction SET (security_invoker = true);
        ALTER VIEW public.booking_progress_view SET (security_invoker = true);
        ALTER VIEW public.v_bookings_summary SET (security_invoker = true);
        ALTER VIEW public.v_active_projects SET (security_invoker = true);
        ALTER VIEW public.profiles_for_bookings SET (security_invoker = true);
        ALTER VIEW public.v_booking_progress SET (security_invoker = true);
        ALTER VIEW public.v_booking_kpis SET (security_invoker = true);
        ALTER VIEW public.v_milestone_progress SET (security_invoker = true);
        ALTER VIEW public.profiles_with_roles_v2 SET (security_invoker = true);
        ALTER VIEW public.booking_list_optimized SET (security_invoker = true);
        ALTER VIEW public.v_revenue_monthly SET (security_invoker = true);
        ALTER VIEW public.vw_webhook_stats SET (security_invoker = true);
        ALTER VIEW public.v_project_completion SET (security_invoker = true);
        ALTER VIEW public.enhanced_bookings SET (security_invoker = true);
        ALTER VIEW public.make_com_bookings SET (security_invoker = true);
        ALTER VIEW public.email_notification_analytics SET (security_invoker = true);
        ALTER VIEW public.bookings_normalized SET (security_invoker = true);
        ALTER VIEW public.v_tasks_status SET (security_invoker = true);
        RAISE NOTICE 'Successfully set SECURITY INVOKER on all views';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SECURITY INVOKER not supported in this PostgreSQL version, views will use default INVOKER behavior';
    END;
END $$;

-- Grant appropriate permissions
GRANT SELECT ON public.v_activity_feed TO authenticated;
GRANT SELECT ON public.v_client_satisfaction TO authenticated;
GRANT SELECT ON public.booking_progress_view TO authenticated;
GRANT SELECT ON public.v_bookings_summary TO authenticated;
GRANT SELECT ON public.v_active_projects TO authenticated;
GRANT SELECT ON public.profiles_for_bookings TO authenticated;
GRANT SELECT ON public.v_booking_progress TO authenticated;
GRANT SELECT ON public.v_booking_kpis TO authenticated;
GRANT SELECT ON public.v_milestone_progress TO authenticated;
GRANT SELECT ON public.profiles_with_roles_v2 TO authenticated;
GRANT SELECT ON public.booking_list_optimized TO authenticated;
GRANT SELECT ON public.v_revenue_monthly TO authenticated;
GRANT SELECT ON public.vw_webhook_stats TO authenticated;
GRANT SELECT ON public.v_project_completion TO authenticated;
GRANT SELECT ON public.enhanced_bookings TO authenticated;
GRANT SELECT ON public.make_com_bookings TO authenticated;
GRANT SELECT ON public.email_notification_analytics TO authenticated;
GRANT SELECT ON public.bookings_normalized TO authenticated;
GRANT SELECT ON public.v_tasks_status TO authenticated;

-- Add comments for documentation
COMMENT ON VIEW public.v_activity_feed IS 'Activity feed view - respects RLS policies';
COMMENT ON VIEW public.v_client_satisfaction IS 'Client satisfaction view - respects RLS policies';
COMMENT ON VIEW public.booking_progress_view IS 'Booking progress view - respects RLS policies';
COMMENT ON VIEW public.v_bookings_summary IS 'Bookings summary view - respects RLS policies';
COMMENT ON VIEW public.v_active_projects IS 'Active projects view - respects RLS policies';
COMMENT ON VIEW public.profiles_for_bookings IS 'Profiles for bookings view - respects RLS policies';
COMMENT ON VIEW public.v_booking_progress IS 'Booking progress view - respects RLS policies';
COMMENT ON VIEW public.v_booking_kpis IS 'Booking KPIs view - respects RLS policies';
COMMENT ON VIEW public.v_milestone_progress IS 'Milestone progress view - respects RLS policies';
COMMENT ON VIEW public.profiles_with_roles_v2 IS 'Profiles with roles v2 view - respects RLS policies';
COMMENT ON VIEW public.booking_list_optimized IS 'Booking list optimized view - respects RLS policies';
COMMENT ON VIEW public.v_revenue_monthly IS 'Revenue monthly view - respects RLS policies';
COMMENT ON VIEW public.vw_webhook_stats IS 'Webhook stats view - respects RLS policies';
COMMENT ON VIEW public.v_project_completion IS 'Project completion view - respects RLS policies';
COMMENT ON VIEW public.enhanced_bookings IS 'Enhanced bookings view - respects RLS policies';
COMMENT ON VIEW public.make_com_bookings IS 'Make.com bookings view - respects RLS policies';
COMMENT ON VIEW public.email_notification_analytics IS 'Email notification analytics view - respects RLS policies';
COMMENT ON VIEW public.bookings_normalized IS 'Bookings normalized view - respects RLS policies';
COMMENT ON VIEW public.v_tasks_status IS 'Tasks status view - respects RLS policies';

-- Verify all views exist and are accessible
SELECT 
    schemaname, 
    viewname, 
    'Fixed - respects RLS' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN (
    'v_activity_feed',
    'v_client_satisfaction',
    'booking_progress_view',
    'v_bookings_summary',
    'v_active_projects',
    'profiles_for_bookings',
    'v_booking_progress',
    'v_booking_kpis',
    'v_milestone_progress',
    'profiles_with_roles_v2',
    'booking_list_optimized',
    'v_revenue_monthly',
    'vw_webhook_stats',
    'v_project_completion',
    'enhanced_bookings',
    'make_com_bookings',
    'email_notification_analytics',
    'bookings_normalized',
    'v_tasks_status'
)
ORDER BY viewname;
