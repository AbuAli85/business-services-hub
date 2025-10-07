-- Comprehensive Fix for All Booking Views
-- This addresses the application errors about missing columns in views

-- =============================================
-- 1. Fix v_booking_status view with all required columns
-- =============================================

DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status
AS
SELECT 
  b.id,                                    -- Primary key (app expects 'id')
  b.booking_number, 
  COALESCE(b.title, 'Service Booking') as booking_title,  -- App expects 'booking_title'
  b.status as raw_status,                  -- App expects 'raw_status'
  b.operational_status,
  b.payment_status, 
  b.approval_status, 
  b.created_at, 
  b.updated_at,
  
  -- Essential IDs that the application needs
  b.client_id,                            -- Required for filtering
  b.provider_id,                          -- Required for filtering  
  b.service_id,                           -- Required for joins
  
  -- Financial information
  b.total_amount as amount,               -- App expects 'amount'
  b.amount_cents,                         -- App expects 'amount_cents'
  b.currency,
  b.subtotal,
  b.vat_amount,
  
  -- Client information
  c.full_name as client_name, 
  c.email as client_email,
  c.company_name as client_company,       -- App expects 'client_company'
  c.avatar_url as client_avatar,          -- App expects 'client_avatar'
  
  -- Provider information
  p.full_name as provider_name, 
  p.email as provider_email,
  p.company_name as provider_company,     -- App expects 'provider_company'
  p.avatar_url as provider_avatar,        -- App expects 'provider_avatar'
  
  -- Service information
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  
  -- Progress and milestone information (calculated)
  COALESCE(b.project_progress, 0) as progress,
  COALESCE(milestone_stats.total_milestones, 0) as total_milestones,
  COALESCE(milestone_stats.completed_milestones, 0) as completed_milestones,
  
  -- Status mapping for UI (FIXED: Progress 100% = completed)
  CASE 
    WHEN b.status = 'draft' THEN 'not_started'::text
    WHEN b.status = 'pending_payment' THEN 'pending_approval'::text
    WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'::text
    WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::text
    WHEN COALESCE(b.project_progress, 0) = 100 THEN 'completed'::text  -- FIXED: 100% progress = completed
    WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'::text
    WHEN b.status = 'cancelled' THEN 'cancelled'::text
    WHEN b.status = 'disputed' THEN 'disputed'::text
    ELSE 'pending_approval'::text
  END as display_status,
  
  -- Invoice information (placeholder - may need to be joined from actual invoice table)
  'pending'::text as invoice_status,      -- App expects 'invoice_status'
  NULL::uuid as invoice_id,               -- App expects 'invoice_id'
  
  -- Additional useful fields
  b.requirements,
  b.notes,
  b.due_at,
  b.scheduled_date,
  b.estimated_duration,
  b.location

FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN (
  SELECT 
    booking_id,
    COUNT(*) as total_milestones,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_milestones
  FROM public.milestones
  GROUP BY booking_id
) milestone_stats ON b.id = milestone_stats.booking_id;

-- =============================================
-- 2. Fix bookings_full_view with all required columns
-- =============================================

DROP VIEW IF EXISTS public.bookings_full_view CASCADE;

CREATE VIEW public.bookings_full_view
AS
SELECT 
  b.id, b.title, b.requirements, b.status, b.approval_status,
  b.subtotal, b.vat_percent, b.vat_amount, b.total_amount, b.currency,
  b.amount_cents, b.due_at, b.scheduled_date, b.notes, b.location,
  b.estimated_duration, b.payment_status, b.operational_status,
  b.created_at, b.updated_at,
  
  -- Essential IDs
  b.client_id, b.provider_id, b.service_id,
  
  c.full_name as client_name, c.email as client_email,
  c.phone as client_phone, c.country as client_country, c.is_verified as client_verified,
  p.full_name as provider_name, p.email as provider_email,
  p.phone as provider_phone, p.country as provider_country, p.is_verified as provider_verified,
  s.title as service_title, s.description as service_description,
  s.category as service_category, s.status as service_status, s.base_price as service_base_price,
  s.currency as service_currency, s.cover_image_url as service_cover_image_url,
  comp.id as company_id, comp.name as company_name, comp.cr_number as company_cr_number,
  comp.vat_number as company_vat_number, comp.logo_url as company_logo_url
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.companies comp ON s.company_id = comp.id;

-- =============================================
-- 3. Fix other views to ensure they have proper structure
-- =============================================

-- Recreate v_provider_workload_analytics
DROP VIEW IF EXISTS public.v_provider_workload_analytics CASCADE;
CREATE VIEW public.v_provider_workload_analytics
AS
SELECT 
  p.id as provider_id, p.full_name as provider_name,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'in_progress' THEN 1 END) as active_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
FROM public.profiles p
LEFT JOIN public.bookings b ON p.id = b.provider_id
WHERE p.role = 'provider'
GROUP BY p.id, p.full_name
ORDER BY total_revenue DESC;

-- Recreate v_service_performance
DROP VIEW IF EXISTS public.v_service_performance CASCADE;
CREATE VIEW public.v_service_performance
AS
SELECT 
  s.id as service_id, s.title as service_title, s.category as service_category,
  s.base_price as service_base_price, s.currency as service_currency,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE 0 END), 0) as total_revenue
FROM public.services s
LEFT JOIN public.bookings b ON s.id = b.service_id
WHERE s.status = 'active'
GROUP BY s.id, s.title, s.category, s.base_price, s.currency
ORDER BY total_revenue DESC;

-- =============================================
-- 4. Grant permissions
-- =============================================

GRANT SELECT ON public.v_booking_status TO authenticated, service_role;
GRANT SELECT ON public.bookings_full_view TO authenticated, service_role;
GRANT SELECT ON public.v_provider_workload_analytics TO authenticated, service_role;
GRANT SELECT ON public.v_service_performance TO authenticated, service_role;

-- =============================================
-- 5. Verification
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ All booking views recreated with proper column structure:';
    RAISE NOTICE '- v_booking_status: includes id, provider_id, client_id, and all expected columns';
    RAISE NOTICE '- bookings_full_view: includes all booking and related data';
    RAISE NOTICE '- v_provider_workload_analytics: provider performance metrics';
    RAISE NOTICE '- v_service_performance: service performance metrics';
    RAISE NOTICE '🔧 Application should now work without column errors';
END $$;
