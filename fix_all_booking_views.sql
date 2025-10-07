-- Comprehensive fix for all booking-related views
-- This script fixes both booking_list_optimized and v_booking_status views

-- 1. Fix booking_list_optimized view (used by useBookingsFullData)
DROP VIEW IF EXISTS public.booking_list_optimized CASCADE;

CREATE VIEW public.booking_list_optimized AS
SELECT 
    b.id,
    b.booking_number,
    b.title as booking_title,
    b.status,
    b.subtotal,
    b.vat_amount,
    b.total_amount,
    b.amount_cents,
    b.currency,
    b.created_at,
    b.updated_at,
    b.due_at,
    b.scheduled_date,
    b.requirements,
    b.notes,
    b.location,
    b.approval_status,
    b.payment_status,
    b.operational_status,
    COALESCE(b.project_progress, 0) as progress_percentage,
    
    -- Service information
    b.service_id,
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    
    -- Client information (CRITICAL: These were missing!)
    b.client_id,
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.company_name as client_company,
    c.avatar_url as client_avatar,
    
    -- Provider information (CRITICAL: These were missing!)
    b.provider_id,
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    p.company_name as provider_company,
    p.avatar_url as provider_avatar,
    
    -- Status display helpers
    CASE 
        WHEN b.status = 'draft' THEN 'not_started'
        WHEN b.status = 'pending_payment' THEN 'pending_review'
        WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'
        WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'
        WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'
        WHEN b.status = 'cancelled' THEN 'cancelled'
        WHEN b.status = 'disputed' THEN 'disputed'
        ELSE 'pending'
    END as display_status,
    
    -- Payment display status
    CASE 
        WHEN b.payment_status = 'paid' THEN 'paid'
        WHEN b.payment_status = 'pending' THEN 'pending'
        WHEN b.payment_status = 'failed' THEN 'failed'
        WHEN b.payment_status = 'refunded' THEN 'refunded'
        ELSE 'unknown'
    END as payment_display_status
    
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 2. Fix v_booking_status view (used by other components)
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status AS
SELECT
  b.id,
  b.booking_number,
  b.title as booking_title,
  b.service_id,
  s.title AS service_title,
  s.description as service_description,
  s.category as service_category,
  b.client_id,
  cp.full_name AS client_name,
  cp.email as client_email,
  cp.phone as client_phone,
  cp.company_name as client_company,
  cp.avatar_url as client_avatar,
  b.provider_id,
  pp.full_name AS provider_name,
  pp.email as provider_email,
  pp.phone as provider_phone,
  pp.company_name as provider_company,
  pp.avatar_url as provider_avatar,
  
  -- Progress calculation
  COALESCE(b.project_progress, 0) AS progress,
  
  -- Milestone counts (simplified for now)
  0 as total_milestones,
  0 as completed_milestones,
  
  b.status AS raw_status,
  b.approval_status,
  
  -- Status mapping
  CASE
    WHEN b.status = 'draft' THEN 'not_started'
    WHEN b.status = 'pending_payment' THEN 'pending_review'
    WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'
    WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'
    WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'
    WHEN b.status = 'cancelled' THEN 'cancelled'
    WHEN b.status = 'disputed' THEN 'disputed'
    ELSE 'pending'
  END as display_status,
  
  -- Payment information
  b.payment_status,
  CASE 
    WHEN b.payment_status = 'paid' THEN 'paid'
    WHEN b.payment_status = 'pending' THEN 'pending'
    WHEN b.payment_status = 'failed' THEN 'failed'
    WHEN b.payment_status = 'refunded' THEN 'refunded'
    ELSE 'unknown'
  END as payment_display_status,
  
  NULL::uuid as invoice_id,
  NULL::text as invoice_status,
  
  -- Amount information
  b.amount_cents,
  b.total_amount as amount,
  b.currency,
  
  -- Timestamps
  b.created_at,
  b.updated_at,
  b.due_at,
  b.scheduled_date,
  b.requirements,
  b.notes,
  b.location
  
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles cp ON b.client_id = cp.id
LEFT JOIN public.profiles pp ON b.provider_id = pp.id;

-- Grant permissions for both views
GRANT SELECT ON public.booking_list_optimized TO authenticated;
GRANT SELECT ON public.booking_list_optimized TO service_role;

GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO service_role;

-- Test both views
SELECT '✅ All booking views created successfully!' as status;
SELECT 'booking_list_optimized:' as view_name, COUNT(*) as total_bookings FROM public.booking_list_optimized;
SELECT 'v_booking_status:' as view_name, COUNT(*) as total_bookings FROM public.v_booking_status;
