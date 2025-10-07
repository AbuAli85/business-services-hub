-- COMPREHENSIVE STATUS SYSTEM FIX
-- This fixes ALL conflicting status mapping systems that were causing the issue

-- 1. Fix the get_booking_display_status function (used by booking_list_enhanced view)
CREATE OR REPLACE FUNCTION public.get_booking_display_status(booking_status TEXT, progress_percentage INTEGER)
RETURNS TEXT AS $$
BEGIN
    -- ✅ CRITICAL FIX: Handle 100% progress FIRST, regardless of booking status
    IF progress_percentage = 100 THEN
        RETURN 'Completed';
    END IF;
    
    -- Then handle other cases
    IF booking_status = 'draft' THEN
        RETURN 'Not Started';
    ELSIF booking_status = 'pending_payment' THEN
        RETURN 'Pending Approval';
    ELSIF booking_status = 'paid' THEN
        IF progress_percentage = 0 THEN
            RETURN 'Approved';
        ELSIF progress_percentage > 0 AND progress_percentage < 100 THEN
            RETURN 'In Progress';
        ELSE
            RETURN 'Approved';
        END IF;
    ELSIF booking_status = 'in_progress' THEN
        RETURN 'In Progress';
    ELSIF booking_status = 'delivered' THEN
        RETURN 'Completed';
    ELSIF booking_status = 'completed' THEN
        RETURN 'Completed';
    ELSIF booking_status = 'cancelled' THEN
        RETURN 'Cancelled';
    ELSIF booking_status = 'disputed' THEN
        RETURN 'Disputed';
    ELSE
        RETURN 'Pending';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix the booking_list_enhanced view (likely used by frontend)
DROP VIEW IF EXISTS public.booking_list_enhanced CASCADE;

CREATE OR REPLACE VIEW public.booking_list_enhanced AS
SELECT 
    b.id,
    b.booking_number,
    b.requirements,
    b.status,
    b.approval_status,
    b.subtotal,
    b.vat_percent,
    b.vat_amount,
    b.total_amount,
    b.currency,
    b.amount_cents,
    b.due_at,
    b.scheduled_date,
    b.notes,
    b.location,
    b.estimated_duration,
    b.payment_status,
    b.operational_status,
    b.created_at,
    b.updated_at,
    
    -- Service information
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    
    -- Enhanced progress information
    COALESCE(b.project_progress, 0) as progress_percentage,
    public.get_booking_display_status(b.status, COALESCE(b.project_progress, 0)) as display_status,
    
    -- Enhanced revenue status
    public.get_revenue_display_status(b.status, b.payment_status) as revenue_display_status,
    
    -- ✅ CRITICAL FIX: Corrected Status mapping for UI (100% progress = completed)
    CASE 
        WHEN b.status = 'draft' THEN 'not_started'::text
        WHEN b.status = 'pending_payment' THEN 'pending_approval'::text
        WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'::text
        WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::text
        WHEN COALESCE(b.project_progress, 0) = 100 THEN 'completed'::text  -- ✅ HIGHEST PRIORITY
        WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'::text
        WHEN b.status = 'cancelled' THEN 'cancelled'::text
        WHEN b.status = 'disputed' THEN 'disputed'::text
        ELSE 'pending_approval'::text
    END as normalized_status,
    
    -- Milestone information
    COALESCE(milestone_stats.milestone_count, 0) as milestone_count,
    COALESCE(milestone_stats.completed_milestones, 0) as completed_milestones,
    
    -- Progress calculation
    CASE 
        WHEN COALESCE(milestone_stats.milestone_count, 0) > 0 THEN
            ROUND((COALESCE(milestone_stats.completed_milestones, 0)::numeric / milestone_stats.milestone_count::numeric) * 100)
        ELSE COALESCE(b.project_progress, 0)
    END as calculated_progress

FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN (
    SELECT 
        booking_id,
        COUNT(*) as milestone_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_milestones
    FROM public.milestones
    GROUP BY booking_id
) milestone_stats ON b.id = milestone_stats.booking_id;

-- 3. Ensure v_booking_status view is also correct (in case it's used)
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status
AS
SELECT 
  b.id, b.booking_number, 
  COALESCE(b.title, 'Service Booking') as booking_title,
  b.status as raw_status, b.operational_status, b.payment_status, b.approval_status, 
  b.created_at, b.updated_at, b.client_id, b.provider_id, b.service_id,
  b.total_amount as amount, b.amount_cents, b.currency, b.subtotal, b.vat_amount,
  c.full_name as client_name, c.email as client_email,
  COALESCE(c.company_name, '') as client_company, COALESCE(c.avatar_url, '') as client_avatar,
  p.full_name as provider_name, p.email as provider_email,
  COALESCE(p.company_name, '') as provider_company, COALESCE(p.avatar_url, '') as provider_avatar,
  s.title as service_title, s.description as service_description, s.category as service_category,
  COALESCE(b.project_progress, 0) as progress,
  0 as total_milestones, 0 as completed_milestones,
  
  -- ✅ CRITICAL FIX: 100% progress = completed (HIGHEST PRIORITY)
  CASE 
    WHEN COALESCE(b.project_progress, 0) = 100 THEN 'completed'::text
    WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::text
    WHEN b.status = 'draft' THEN 'not_started'::text
    WHEN b.status = 'pending_payment' THEN 'pending_approval'::text
    WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'::text
    WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'::text
    WHEN b.status = 'cancelled' THEN 'cancelled'::text
    WHEN b.status = 'disputed' THEN 'disputed'::text
    ELSE 'pending_approval'::text
  END as display_status,
  
  'pending'::text as invoice_status, NULL::uuid as invoice_id,
  b.requirements, b.notes, b.due_at, b.scheduled_date, b.estimated_duration, b.location

FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- Grant permissions
GRANT SELECT ON public.booking_list_enhanced TO authenticated, service_role;
GRANT SELECT ON public.v_booking_status TO authenticated, service_role;

-- Success message
SELECT '✅ COMPREHENSIVE STATUS SYSTEM FIX APPLIED!' as status;

-- Test both views
SELECT 'Testing v_booking_status view:' as test_type;
SELECT booking_title, progress, raw_status, display_status 
FROM public.v_booking_status 
WHERE progress = 100;

SELECT 'Testing booking_list_enhanced view:' as test_type;
SELECT service_title, progress_percentage, status, normalized_status, display_status 
FROM public.booking_list_enhanced 
WHERE progress_percentage = 100;
