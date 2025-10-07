-- Simple fix for booking_list_optimized view missing columns
-- Compatible with all PostgreSQL versions

-- Drop the existing view
DROP VIEW IF EXISTS public.booking_list_optimized CASCADE;

-- Recreate the view with all required columns
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
    b.requirements,
    b.notes,
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

-- Grant permissions
GRANT SELECT ON public.booking_list_optimized TO authenticated;
GRANT SELECT ON public.booking_list_optimized TO service_role;

-- Test the view
SELECT 'View created successfully!' as result;
SELECT COUNT(*) as total_bookings FROM public.booking_list_optimized;
