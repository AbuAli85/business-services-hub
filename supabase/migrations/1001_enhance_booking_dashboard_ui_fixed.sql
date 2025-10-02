-- Enhance Booking Dashboard UI and User Experience (Fixed Syntax)
-- This migration adds additional improvements based on user feedback

-- 1. Create enhanced booking status mapping for better UI display
CREATE OR REPLACE FUNCTION public.get_booking_display_status(booking_status TEXT, progress_percentage INTEGER)
RETURNS TEXT AS $$
BEGIN
    -- Map internal status to user-friendly display status
    IF booking_status = 'draft' THEN
        RETURN 'Not Started';
    ELSIF booking_status = 'pending_payment' THEN
        RETURN 'Pending Approval';
    ELSIF booking_status = 'paid' THEN
        IF progress_percentage = 0 THEN
            RETURN 'Approved';
        ELSIF progress_percentage > 0 AND progress_percentage < 100 THEN
            RETURN 'In Progress';
        ELSIF progress_percentage = 100 THEN
            RETURN 'Completed';
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

-- 2. Create function to get revenue status for better display
CREATE OR REPLACE FUNCTION public.get_revenue_display_status(booking_status TEXT, payment_status TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Map booking and payment status to revenue status
    IF booking_status IN ('cancelled', 'disputed') THEN
        RETURN 'N/A';
    ELSIF payment_status = 'paid' THEN
        RETURN 'PAID';
    ELSIF booking_status IN ('approved', 'in_progress', 'completed') THEN
        RETURN 'PENDING';
    ELSE
        RETURN 'N/A';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Create enhanced booking list view with better UI data
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
    
    -- Rating placeholder (for future implementation)
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

-- 4. Create function to get booking statistics with better calculations
CREATE OR REPLACE FUNCTION public.get_enhanced_booking_stats(
    user_id UUID DEFAULT NULL,
    user_role TEXT DEFAULT 'client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    stats_record RECORD;
    bookings_data JSONB;
BEGIN
    -- Get user-specific stats if user_id provided
    IF user_id IS NOT NULL THEN
        -- For providers: their services' bookings
        IF user_role = 'provider' THEN
            SELECT * INTO stats_record
            FROM public.booking_dashboard_stats
            WHERE EXISTS (
                SELECT 1 FROM public.bookings b
                JOIN public.services s ON b.service_id = s.id
                WHERE s.provider_id = user_id
            );
        -- For clients: their bookings
        ELSIF user_role = 'client' THEN
            SELECT * INTO stats_record
            FROM public.booking_dashboard_stats
            WHERE EXISTS (
                SELECT 1 FROM public.bookings b
                WHERE b.client_id = user_id
            );
        -- For admins: all bookings
        ELSE
            SELECT * INTO stats_record FROM public.booking_dashboard_stats;
        END IF;
    ELSE
        SELECT * INTO stats_record FROM public.booking_dashboard_stats;
    END IF;
    
    -- Get recent bookings with enhanced data
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'booking_number', booking_number,
            'service_title', service_title,
            'client_name', client_name,
            'provider_name', provider_name,
            'status', status,
            'display_status', display_status,
            'normalized_status', normalized_status,
            'total_amount', total_amount,
            'currency', currency,
            'revenue_display_status', revenue_display_status,
            'progress_percentage', progress_percentage,
            'progress_status', progress_status,
            'milestone_count', milestone_count,
            'completed_milestones', completed_milestones,
            'total_tasks', total_tasks,
            'completed_tasks', completed_tasks,
            'duration_display', duration_display,
            'rating', rating,
            'rating_text', rating_text,
            'created_at', created_at,
            'updated_at', updated_at,
            'sort_priority', sort_priority
        ) ORDER BY sort_priority, updated_at DESC
    ), '[]'::json) INTO bookings_data
    FROM public.booking_list_enhanced
    WHERE (user_id IS NULL OR 
           (user_role = 'provider' AND provider_name IS NOT NULL) OR
           (user_role = 'client' AND client_name IS NOT NULL))
    LIMIT 50;
    
    -- Build result with enhanced metrics
    result := json_build_object(
        'stats', COALESCE(to_jsonb(stats_record), '{}'::jsonb),
        'bookings', bookings_data,
        'last_updated', CURRENT_TIMESTAMP,
        'ui_enhancements', json_build_object(
            'has_enhanced_status', true,
            'has_progress_tracking', true,
            'has_revenue_status', true,
            'has_duration_display', true
        )
    );
    
    RETURN result;
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_booking_display_status(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_display_status(TEXT, TEXT) TO authenticated;
GRANT SELECT ON public.booking_list_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_enhanced_booking_stats(UUID, TEXT) TO authenticated;

-- 6. Add comments
COMMENT ON FUNCTION public.get_booking_display_status(TEXT, INTEGER) IS 'Maps internal booking status to user-friendly display status';
COMMENT ON FUNCTION public.get_revenue_display_status(TEXT, TEXT) IS 'Maps booking and payment status to revenue display status';
COMMENT ON VIEW public.booking_list_enhanced IS 'Enhanced booking list with better UI data and display statuses';
COMMENT ON FUNCTION public.get_enhanced_booking_stats(UUID, TEXT) IS 'Enhanced booking statistics with better UI data';

-- 7. Log completion
DO $$
BEGIN
    RAISE NOTICE 'Booking dashboard UI enhancements applied successfully!';
    RAISE NOTICE 'Added user-friendly status mapping';
    RAISE NOTICE 'Added revenue status display';
    RAISE NOTICE 'Added duration display formatting';
    RAISE NOTICE 'Added enhanced progress tracking';
    RAISE NOTICE 'Added better sorting and prioritization';
END $$;
