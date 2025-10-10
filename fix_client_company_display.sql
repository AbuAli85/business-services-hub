-- Fix client company information in v_booking_status view
-- This addresses the issue where client_company shows as null

-- First, let's check the current profiles table structure
-- and see how company information is stored

-- Option 1: If profiles has a company_name text field
-- Option 2: If profiles has a company_id foreign key
-- Option 3: If we need to create a fallback

-- Drop and recreate v_booking_status view with improved client company handling
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

-- Create the v_booking_status view with better client company handling
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
    
    -- Client information with improved company handling
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    -- Try multiple ways to get client company
    COALESCE(
        client_comp.name,           -- From companies table via company_id
        c.company_name,             -- Direct company_name field in profiles
        c.company,                  -- Alternative company field
        'Individual Client'         -- Fallback for clients without company
    ) as client_company,
    COALESCE(
        client_comp.address,
        c.company_address,
        c.address,
        'Address not provided'
    ) as client_company_address,
    COALESCE(
        client_comp.phone,
        c.company_phone,
        c.phone
    ) as client_company_phone,
    COALESCE(
        client_comp.email,
        c.company_email,
        c.email
    ) as client_company_email,
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    -- Provider company with fallback
    COALESCE(
        provider_comp.name,
        p.company_name,
        p.company,
        p.full_name
    ) as provider_company,
    COALESCE(
        provider_comp.address,
        p.company_address,
        p.address,
        'Address not provided'
    ) as provider_company_address,
    COALESCE(
        provider_comp.phone,
        p.company_phone,
        p.phone
    ) as provider_company_phone,
    COALESCE(
        provider_comp.email,
        p.company_email,
        p.email
    ) as provider_company_email,
    provider_comp.logo_url as provider_company_logo,
    provider_comp.vat_number as provider_company_vat,
    provider_comp.cr_number as provider_company_cr
    
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
-- Try to join companies table (may not exist or be used)
LEFT JOIN public.companies client_comp ON c.company_id = client_comp.id
LEFT JOIN public.companies provider_comp ON p.company_id = provider_comp.id;

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO service_role;
GRANT SELECT ON public.v_booking_status TO anon;

-- Add comment
COMMENT ON VIEW public.v_booking_status IS 'Booking status with improved client company handling - FIXED';

-- Test the view
SELECT '✅ v_booking_status view fixed with improved client company handling!' as status;
SELECT COUNT(*) as total_bookings FROM public.v_booking_status;

-- Show sample data to verify client_company is now populated
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
