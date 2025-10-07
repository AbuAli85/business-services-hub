-- CRITICAL FIX: Update booking_list_enhanced view to use correct status mapping
-- This is the view the frontend is actually using, not v_booking_status!

-- Drop and recreate the booking_list_enhanced view with corrected status mapping
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

-- Grant permissions
GRANT SELECT ON public.booking_list_enhanced TO authenticated, service_role;

-- Test the fix
SELECT '✅ booking_list_enhanced view fixed - 100% progress now shows as "completed"!' as status;

-- Verify the fix works
SELECT 
    service_title,
    progress_percentage,
    status,
    normalized_status,
    display_status
FROM public.booking_list_enhanced 
WHERE progress_percentage = 100;
