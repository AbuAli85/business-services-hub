-- Migration: Create Enhanced Bookings View
-- Date: December 2024
-- Description: Create a view that joins bookings with profiles and services to show actual names

-- Create enhanced bookings view with joined data
CREATE OR REPLACE VIEW public.enhanced_bookings AS
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
    c.phone as client_phone,
    c.company_id as client_company_id,
    -- Provider information
    p.full_name as provider_name,
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

-- Grant access to the view
GRANT SELECT ON public.enhanced_bookings TO authenticated;
GRANT SELECT ON public.enhanced_bookings TO anon;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_client_id ON public.enhanced_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_provider_id ON public.enhanced_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_service_id ON public.enhanced_bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_status ON public.enhanced_bookings(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_bookings_created_at ON public.enhanced_bookings(created_at);

-- Verify the view was created
SELECT 'Enhanced bookings view created successfully' as status;

-- Show sample data from the view
SELECT 'Sample data from enhanced view:' as info;
SELECT 
    id, 
    client_name, 
    provider_name, 
    service_title, 
    status, 
    created_at
FROM public.enhanced_bookings 
LIMIT 3;
