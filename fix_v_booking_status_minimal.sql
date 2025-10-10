-- Minimal fix for v_booking_status view
-- Only use columns that definitely exist based on the data we've seen

-- Drop and recreate v_booking_status view with minimal columns
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

-- Create the v_booking_status view with only confirmed existing columns
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
    
    -- Client information (using only confirmed existing columns)
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    -- Client company: prioritize companies table, then profile fields
    CASE 
        WHEN client_comp.name IS NOT NULL AND client_comp.name != '' THEN client_comp.name
        WHEN c.company_name IS NOT NULL AND c.company_name != '' THEN c.company_name
        WHEN c.company_id IS NOT NULL THEN 'Company (ID: ' || c.company_id || ')'
        ELSE 'Individual Client'
    END as client_company,
    -- Use only companies table for address (no profile address column)
    COALESCE(
        client_comp.address,
        'Address not provided'
    ) as client_company_address,
    -- Use only companies table for phone (no profile phone column)
    COALESCE(
        client_comp.phone,
        c.phone
    ) as client_company_phone,
    -- Use only companies table for email (no profile email column)
    COALESCE(
        client_comp.email,
        c.email
    ) as client_company_email,
    
    -- Provider information (using only confirmed existing columns)
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    -- Provider company: prioritize companies table, then profile fields
    CASE 
        WHEN provider_comp.name IS NOT NULL AND provider_comp.name != '' THEN provider_comp.name
        WHEN p.company_name IS NOT NULL AND p.company_name != '' THEN p.company_name
        WHEN p.company_id IS NOT NULL THEN 'Company (ID: ' || p.company_id || ')'
        ELSE p.full_name
    END as provider_company,
    -- Use only companies table for address (no profile address column)
    COALESCE(
        provider_comp.address,
        'Address not provided'
    ) as provider_company_address,
    -- Use only companies table for phone (no profile phone column)
    COALESCE(
        provider_comp.phone,
        p.phone
    ) as provider_company_phone,
    -- Use only companies table for email (no profile email column)
    COALESCE(
        provider_comp.email,
        p.email
    ) as provider_company_email,
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
COMMENT ON VIEW public.v_booking_status IS 'Booking status with minimal column handling - MINIMAL FIX (only confirmed existing columns)';

-- Test the view
SELECT '✅ v_booking_status view fixed with minimal column handling!' as status;
SELECT COUNT(*) as total_bookings FROM public.v_booking_status;

-- Show sample data to verify client_company is now properly populated
SELECT 
    booking_id,
    service_title,
    client_name,
    client_company,
    provider_name,
    provider_company
FROM public.v_booking_status 
WHERE booking_id IN ('71a06a25-8925-4579-b55a-e141c96908fc', '5c3f1125-fa0b-40c3-a5c7-af306b6a796b', '789c854b-2884-4ddc-bbdc-d7158908202a')
LIMIT 5;
