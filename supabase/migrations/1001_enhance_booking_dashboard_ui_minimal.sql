-- Minimal Booking Dashboard UI Enhancements
-- Simple functions without complex syntax

-- 1. Simple booking status display function
CREATE OR REPLACE FUNCTION public.get_booking_display_status(booking_status TEXT, progress_percentage INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF booking_status = 'draft' THEN
        RETURN 'Not Started';
    ELSIF booking_status = 'pending_payment' THEN
        RETURN 'Pending Approval';
    ELSIF booking_status = 'paid' AND progress_percentage = 0 THEN
        RETURN 'Approved';
    ELSIF booking_status = 'paid' AND progress_percentage > 0 AND progress_percentage < 100 THEN
        RETURN 'In Progress';
    ELSIF booking_status = 'paid' AND progress_percentage = 100 THEN
        RETURN 'Completed';
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

-- 2. Simple revenue status function
CREATE OR REPLACE FUNCTION public.get_revenue_display_status(booking_status TEXT, payment_status TEXT)
RETURNS TEXT AS $$
BEGIN
    IF booking_status IN ('cancelled', 'disputed') THEN
        RETURN 'N/A';
    ELSIF payment_status = 'paid' THEN
        RETURN 'PAID';
    ELSIF booking_status IN ('paid', 'in_progress', 'completed') THEN
        RETURN 'PENDING';
    ELSE
        RETURN 'N/A';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Simple enhanced booking list view
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
    
    -- Status mapping for UI
    CASE 
        WHEN b.status = 'draft' THEN 'not_started'::booking_status_normalized
        WHEN b.status = 'pending_payment' THEN 'pending_approval'::booking_status_normalized
        WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'::booking_status_normalized
        WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'::booking_status_normalized
        WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::booking_status_normalized
        WHEN b.status = 'cancelled' THEN 'cancelled'::booking_status_normalized
        WHEN b.status = 'disputed' THEN 'disputed'::booking_status_normalized
        ELSE 'pending_approval'::booking_status_normalized
    END as normalized_status,
    
    -- Milestone information
    COALESCE(milestone_stats.milestone_count, 0) as milestone_count,
    COALESCE(milestone_stats.completed_milestones, 0) as completed_milestones,
    COALESCE(milestone_stats.total_tasks, 0) as total_tasks,
    COALESCE(milestone_stats.completed_tasks, 0) as completed_tasks,
    
    -- Progress status for UI
    CASE 
        WHEN COALESCE(b.project_progress, 0) = 0 AND b.status IN ('paid', 'in_progress') THEN 'Not Started'
        WHEN COALESCE(b.project_progress, 0) > 0 AND COALESCE(b.project_progress, 0) < 100 THEN 'In Progress'
        WHEN COALESCE(b.project_progress, 0) = 100 THEN 'Completed'
        ELSE 'Pending'
    END as progress_status,
    
    -- Duration information
    CASE 
        WHEN b.estimated_duration IS NOT NULL THEN CONCAT(b.estimated_duration, ' days')
        WHEN b.scheduled_date IS NOT NULL AND b.due_at IS NOT NULL THEN 
            CONCAT(EXTRACT(DAYS FROM (b.due_at - b.scheduled_date))::INTEGER, ' days')
        ELSE 'TBD'
    END as duration_display,
    
    -- Rating placeholder
    NULL::NUMERIC as rating,
    'N/A' as rating_text,
    
    -- Priority for sorting
    CASE 
        WHEN b.status = 'disputed' THEN 1
        WHEN b.status = 'cancelled' THEN 2
        WHEN b.status = 'completed' THEN 3
        WHEN b.status = 'in_progress' THEN 4
        WHEN b.status = 'paid' THEN 5
        WHEN b.status = 'pending_payment' THEN 6
        WHEN b.status = 'draft' THEN 7
        ELSE 8
    END as sort_priority

FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(DISTINCT m.id) as milestone_count,
        COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') as completed_milestones,
        COUNT(t.id) as total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
    FROM public.milestones m
    LEFT JOIN public.tasks t ON m.id = t.milestone_id
    WHERE m.booking_id = b.id
) milestone_stats ON true;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_booking_display_status(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_display_status(TEXT, TEXT) TO authenticated;
GRANT SELECT ON public.booking_list_enhanced TO authenticated;

-- 5. Add comments
COMMENT ON FUNCTION public.get_booking_display_status(TEXT, INTEGER) IS 'Maps internal booking status to user-friendly display status';
COMMENT ON FUNCTION public.get_revenue_display_status(TEXT, TEXT) IS 'Maps booking and payment status to revenue display status';
COMMENT ON VIEW public.booking_list_enhanced IS 'Enhanced booking list with better UI data and display statuses';

-- 6. Log completion
DO $$
BEGIN
    RAISE NOTICE 'Minimal booking dashboard UI enhancements applied successfully!';
    RAISE NOTICE 'Added user-friendly status mapping';
    RAISE NOTICE 'Added revenue status display';
    RAISE NOTICE 'Added duration display formatting';
    RAISE NOTICE 'Added enhanced progress tracking';
END $$;
