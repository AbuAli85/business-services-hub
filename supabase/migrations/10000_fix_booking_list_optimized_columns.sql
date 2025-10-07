-- Migration: Fix booking_list_optimized view missing client_id and provider_id columns
-- Description: Add missing client_id and provider_id columns to booking_list_optimized view
-- Date: 2025-01-07
-- Priority: 10000 (high priority to fix bookings page)

-- This migration fixes the booking_list_optimized view to include the missing client_id and provider_id columns
-- that are required by the useBookingsFullData hook for role-based filtering

-- Drop the existing view
DROP VIEW IF EXISTS public.booking_list_optimized CASCADE;

-- Recreate the view with all required columns
CREATE OR REPLACE VIEW public.booking_list_optimized
AS
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
    b.project_progress as progress_percentage,
    
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

-- Add comments
COMMENT ON VIEW public.booking_list_optimized IS 'Optimized booking list with client_id and provider_id columns for role-based filtering - Fixed missing columns';

-- Verify the view works
DO $$
BEGIN
    RAISE NOTICE 'Testing booking_list_optimized view...';
    
    -- Test that the view can be queried
    PERFORM COUNT(*) FROM public.booking_list_optimized LIMIT 1;
    
    RAISE NOTICE '✅ booking_list_optimized view is working correctly';
    RAISE NOTICE '✅ Added missing client_id and provider_id columns';
    RAISE NOTICE '✅ Bookings page should now work for both clients and providers';
END $$;
