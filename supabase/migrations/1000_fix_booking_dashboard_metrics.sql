-- Fix Booking Dashboard Metrics and Performance Issues
-- This migration addresses the booking dashboard data inconsistencies and performance problems

-- 1. Create normalized booking status enum
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_normalized') THEN
        CREATE TYPE booking_status_normalized AS ENUM (
            'not_started',
            'pending_approval', 
            'approved',
            'in_progress',
            'completed',
            'cancelled',
            'disputed'
        );
    END IF;
END $$;

-- 2. Create comprehensive booking statistics view
CREATE OR REPLACE VIEW public.booking_dashboard_stats AS
WITH booking_metrics AS (
    SELECT 
        -- Basic counts
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status IN ('approved', 'in_progress')) as active_bookings,
        COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
        COUNT(*) FILTER (WHERE status = 'disputed') as disputed_bookings,
        
        -- Revenue calculations
        SUM(CASE 
            WHEN status IN ('approved', 'in_progress', 'completed') 
            THEN COALESCE(total_amount, 0) 
            ELSE 0 
        END) as total_revenue,
        
        SUM(CASE 
            WHEN status = 'completed' 
            THEN COALESCE(total_amount, 0) 
            ELSE 0 
        END) as completed_revenue,
        
        -- Progress calculations
        AVG(CASE 
            WHEN status IN ('approved', 'in_progress', 'completed')
            THEN COALESCE(project_progress, 0)
            ELSE NULL
        END) as avg_progress_percentage,
        
        -- Success rate calculation
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
            ELSE 0
        END as success_rate,
        
        -- Portfolio percentage (active vs total capacity)
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status IN ('approved', 'in_progress'))::NUMERIC / GREATEST(COUNT(*), 1)::NUMERIC) * 100, 1)
            ELSE 0
        END as portfolio_percentage
        
    FROM public.bookings
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 year' -- Last year's data
),
milestone_metrics AS (
    SELECT 
        COUNT(DISTINCT b.id) as bookings_with_milestones,
        AVG(CASE 
            WHEN m.id IS NOT NULL THEN COALESCE(m.progress_percentage, 0)
            ELSE 0
        END) as avg_milestone_progress
    FROM public.bookings b
    LEFT JOIN public.milestones m ON b.id = m.booking_id
    WHERE b.created_at >= CURRENT_DATE - INTERVAL '1 year'
)
SELECT 
    -- Basic metrics
    bm.total_bookings,
    bm.active_bookings,
    bm.pending_bookings,
    bm.completed_bookings,
    bm.cancelled_bookings,
    bm.disputed_bookings,
    
    -- Revenue metrics
    bm.total_revenue,
    bm.completed_revenue,
    COALESCE(bm.total_revenue - bm.completed_revenue, 0) as pending_revenue,
    
    -- Progress metrics
    COALESCE(bm.avg_progress_percentage, 0) as avg_progress_percentage,
    COALESCE(mm.avg_milestone_progress, 0) as avg_milestone_progress,
    
    -- Rate calculations
    bm.success_rate,
    bm.portfolio_percentage,
    
    -- Additional metrics
    COALESCE(mm.bookings_with_milestones, 0) as bookings_with_milestones,
    
    -- Timestamps
    CURRENT_TIMESTAMP as last_updated
    
FROM booking_metrics bm
CROSS JOIN milestone_metrics mm;

-- 3. Create optimized booking list view with proper status mapping
CREATE OR REPLACE VIEW public.booking_list_optimized AS
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
    
    -- Progress information
    COALESCE(b.project_progress, 0) as progress_percentage,
    CASE 
        WHEN b.project_progress = 0 AND b.status = 'approved' THEN 'Not Started'
        WHEN b.project_progress > 0 AND b.project_progress < 100 THEN 'In Progress'
        WHEN b.project_progress = 100 THEN 'Completed'
        ELSE 'Pending'
    END as progress_status,
    
    -- Status mapping
    CASE 
        WHEN b.status = 'draft' THEN 'not_started'::booking_status_normalized
        WHEN b.status = 'pending_payment' THEN 'pending_approval'::booking_status_normalized
        WHEN b.status = 'paid' AND b.project_progress = 0 THEN 'approved'::booking_status_normalized
        WHEN b.status = 'in_progress' OR (b.status = 'paid' AND b.project_progress > 0) THEN 'in_progress'::booking_status_normalized
        WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::booking_status_normalized
        WHEN b.status = 'cancelled' THEN 'cancelled'::booking_status_normalized
        WHEN b.status = 'disputed' THEN 'disputed'::booking_status_normalized
        ELSE 'pending_approval'::booking_status_normalized
    END as normalized_status,
    
    -- Revenue status
    CASE 
        WHEN b.status IN ('approved', 'in_progress', 'completed') AND b.payment_status = 'paid' THEN 'PAID'
        WHEN b.status IN ('approved', 'in_progress', 'completed') THEN 'PENDING'
        ELSE 'N/A'
    END as revenue_status,
    
    -- Milestone count
    COALESCE(milestone_stats.milestone_count, 0) as milestone_count,
    COALESCE(milestone_stats.completed_milestones, 0) as completed_milestones,
    
    -- Rating (placeholder for future implementation)
    NULL::NUMERIC as rating,
    'N/A' as rating_text

FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) as milestone_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_milestones
    FROM public.milestones m
    WHERE m.booking_id = b.id
) milestone_stats ON true;

-- 4. Create RPC function for dashboard data
CREATE OR REPLACE FUNCTION public.get_booking_dashboard_data(
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
    
    -- Get recent bookings
    SELECT COALESCE(json_agg(
        json_build_object(
            'id', id,
            'booking_number', booking_number,
            'service_title', service_title,
            'client_name', client_name,
            'provider_name', provider_name,
            'status', status,
            'normalized_status', normalized_status,
            'total_amount', total_amount,
            'currency', currency,
            'revenue_status', revenue_status,
            'progress_percentage', progress_percentage,
            'progress_status', progress_status,
            'milestone_count', milestone_count,
            'completed_milestones', completed_milestones,
            'rating', rating,
            'rating_text', rating_text,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ), '[]'::json) INTO bookings_data
    FROM public.booking_list_optimized
    WHERE (user_id IS NULL OR 
           (user_role = 'provider' AND provider_name IS NOT NULL) OR
           (user_role = 'client' AND client_name IS NOT NULL))
    ORDER BY updated_at DESC
    LIMIT 50;
    
    -- Build result
    result := json_build_object(
        'stats', COALESCE(to_jsonb(stats_record), '{}'::jsonb),
        'bookings', bookings_data,
        'last_updated', CURRENT_TIMESTAMP
    );
    
    RETURN result;
END;
$$;

-- 5. Create function to update booking progress from milestones
CREATE OR REPLACE FUNCTION public.update_booking_progress_from_milestones(booking_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_progress INTEGER;
    total_milestones INTEGER;
    completed_milestones INTEGER;
BEGIN
    -- Get milestone counts
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_milestones, completed_milestones
    FROM public.milestones
    WHERE booking_id = booking_uuid;
    
    -- Calculate progress percentage
    IF total_milestones > 0 THEN
        new_progress := ROUND((completed_milestones::NUMERIC / total_milestones::NUMERIC) * 100);
    ELSE
        new_progress := 0;
    END IF;
    
    -- Update booking progress
    UPDATE public.bookings
    SET 
        project_progress = new_progress,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = booking_uuid;
    
    RETURN new_progress;
END;
$$;

-- 6. Create trigger to auto-update booking progress when milestones change
CREATE OR REPLACE FUNCTION public.trigger_update_booking_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update progress for the affected booking
    PERFORM public.update_booking_progress_from_milestones(
        COALESCE(NEW.booking_id, OLD.booking_id)
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS update_booking_progress_on_milestone_change ON public.milestones;
CREATE TRIGGER update_booking_progress_on_milestone_change
    AFTER INSERT OR UPDATE OR DELETE ON public.milestones
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_booking_progress();

-- 7. Grant permissions
GRANT SELECT ON public.booking_dashboard_stats TO authenticated;
GRANT SELECT ON public.booking_list_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_dashboard_data(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_progress_from_milestones(UUID) TO authenticated;

-- 8. Add comments
COMMENT ON VIEW public.booking_dashboard_stats IS 'Normalized booking statistics for dashboard display';
COMMENT ON VIEW public.booking_list_optimized IS 'Optimized booking list with proper status mapping and progress tracking';
COMMENT ON FUNCTION public.get_booking_dashboard_data(UUID, TEXT) IS 'Single endpoint for all dashboard data to reduce API calls';
COMMENT ON FUNCTION public.update_booking_progress_from_milestones(UUID) IS 'Updates booking progress based on milestone completion';

-- 9. Log completion
DO $$
BEGIN
    RAISE NOTICE 'Booking dashboard metrics fix applied successfully!';
    RAISE NOTICE 'Created normalized booking status enum';
    RAISE NOTICE 'Created comprehensive dashboard statistics view';
    RAISE NOTICE 'Created optimized booking list view';
    RAISE NOTICE 'Created single RPC endpoint for dashboard data';
    RAISE NOTICE 'Added automatic progress tracking from milestones';
    RAISE NOTICE 'Fixed data inconsistencies (active vs total, revenue calculations)';
END $$;
