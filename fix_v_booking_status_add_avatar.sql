-- Add missing client_avatar column to v_booking_status view

-- Drop and recreate v_booking_status view with client_avatar column
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

-- Create the v_booking_status view with client_avatar column added
CREATE VIEW public.v_booking_status
WITH (security_invoker = true)
AS
SELECT 
    b.id as id,
    b.id as booking_id,
    COALESCE(b.title, 'Service Booking') as booking_title,
    b.status as booking_status,
    b.created_at as booking_created_at,
    b.updated_at as booking_updated_at,
    
    -- Progress calculation
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN COALESCE(b.project_progress, 50)
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as progress,
    
    -- Amount fields
    COALESCE(b.total_amount, 0) as amount,
    b.subtotal,
    b.vat_percent,
    b.vat_amount,
    b.total_amount,
    b.currency,
    
    -- Display status
    CASE 
        WHEN b.status = 'pending_payment' THEN 'pending'
        WHEN b.status = 'paid' THEN 'approved'
        WHEN b.status = 'in_progress' THEN 'in_progress'
        WHEN b.status = 'completed' THEN 'completed'
        WHEN b.status = 'delivered' THEN 'completed'
        WHEN b.status = 'cancelled' THEN 'cancelled'
        ELSE b.status
    END as display_status,
    
    -- Core booking fields
    b.client_id,
    b.provider_id,
    b.service_id,
    b.scheduled_date,
    b.due_at,
    b.requirements,
    b.package_id,
    b.created_at as created_at,
    b.updated_at as updated_at,
    
    -- Service information
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    s.base_price as service_base_price,
    
    -- Client information (basic only)
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    c.avatar_url as client_avatar,  -- ADD THIS MISSING COLUMN
    -- Client company: simple logic
    CASE 
        WHEN client_comp.name IS NOT NULL AND client_comp.name != '' THEN client_comp.name
        WHEN c.company_name IS NOT NULL AND c.company_name != '' THEN c.company_name
        WHEN c.company_id IS NOT NULL THEN 'Company'
        ELSE 'Individual'
    END as client_company,
    
    -- Provider information (basic only)
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    p.avatar_url as provider_avatar,  -- ADD THIS FOR CONSISTENCY
    -- Provider company: simple logic
    CASE 
        WHEN provider_comp.name IS NOT NULL AND provider_comp.name != '' THEN provider_comp.name
        WHEN p.company_name IS NOT NULL AND p.company_name != '' THEN p.company_name
        WHEN p.company_id IS NOT NULL THEN 'Company'
        ELSE p.full_name
    END as provider_company,
    
    -- Company information from companies table (avoid any JSON issues)
    client_comp.address as client_company_address,
    client_comp.phone as client_company_phone,
    client_comp.email as client_company_email,
    provider_comp.address as provider_company_address,
    provider_comp.phone as provider_company_phone,
    provider_comp.email as provider_company_email,
    provider_comp.logo_url as provider_company_logo,
    provider_comp.vat_number as provider_company_vat,
    provider_comp.cr_number as provider_company_cr
    
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
-- Join with companies table to get actual company names
LEFT JOIN public.companies client_comp ON c.company_id = client_comp.id
LEFT JOIN public.companies provider_comp ON p.company_id = provider_comp.id;

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO service_role;
GRANT SELECT ON public.v_booking_status TO anon;

-- Add comment
COMMENT ON VIEW public.v_booking_status IS 'Booking status with client_avatar column added - FIXED';

-- Test the view
SELECT '✅ v_booking_status view fixed with client_avatar column!' as status;
SELECT COUNT(*) as total_bookings FROM public.v_booking_status;

-- Show sample data to verify client_avatar column exists
SELECT 
    booking_id,
    service_title,
    client_name,
    client_avatar,
    provider_name,
    provider_avatar
FROM public.v_booking_status 
WHERE booking_id IN ('71a06a25-8925-4579-b55a-e141c96908fc', '5c3f1125-fa0b-40c3-a5c7-af306b6a796b', '789c854b-2884-4ddc-bbdc-d7158908202a')
LIMIT 5;
