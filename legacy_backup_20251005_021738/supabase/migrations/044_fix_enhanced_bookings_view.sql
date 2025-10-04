-- Migration: Fix Enhanced Bookings View
-- Date: December 2024
-- Description: Drop and recreate the enhanced bookings view to fix column naming issues

-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.enhanced_bookings;

-- Create enhanced bookings view with joined data
CREATE VIEW public.enhanced_bookings AS
SELECT 
    b.id,
    b.client_id,
    b.provider_id,
    b.service_id,
    b.status,
    b.created_at,
    b.updated_at,
    b.scheduled_date,
    b.scheduled_time,
    b.notes,
    b.amount,
    b.payment_status,
    b.rating,
    b.review,
    b.estimated_duration,
    b.location,
    b.cancellation_reason,
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.company_id as client_company_id,
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    p.company_id as provider_company_id,
    -- Service information
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    s.base_price as service_base_price,
    s.currency as service_currency,
    -- Company information
    cc.name as client_company_name,
    pc.name as provider_company_name
FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.companies cc ON c.company_id = cc.id
LEFT JOIN public.companies pc ON p.company_id = pc.id;

-- Grant permissions
GRANT SELECT ON public.enhanced_bookings TO authenticated;
GRANT SELECT ON public.enhanced_bookings TO anon;
