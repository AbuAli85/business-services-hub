-- Fix v_booking_status view to include ALL missing columns for invoice generation
-- This resolves multiple column errors like:
-- - "column v_booking_status.service_description does not exist"
-- - "column v_booking_status.client_company does not exist"

-- Drop and recreate v_booking_status view with ALL required columns
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

-- Create the v_booking_status view with ALL columns needed for invoice generation
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
    
    -- Progress calculation - use project_progress
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
    
    -- Add aliases for API compatibility
    b.created_at as created_at,
    b.updated_at as updated_at,
    
    -- Service information
    s.title as service_title,
    s.description as service_description,
    s.category as service_category,
    s.base_price as service_base_price,
    
    -- Client information
    c.full_name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    -- Client company information (from companies table)
    client_comp.name as client_company,
    client_comp.address as client_company_address,
    client_comp.phone as client_company_phone,
    client_comp.email as client_company_email,
    
    -- Provider information
    p.full_name as provider_name,
    p.email as provider_email,
    p.phone as provider_phone,
    -- Provider company information (from companies table)
    provider_comp.name as provider_company,
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
-- Join client company
LEFT JOIN public.companies client_comp ON c.company_id = client_comp.id
-- Join provider company  
LEFT JOIN public.companies provider_comp ON p.company_id = provider_comp.id;

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO service_role;
GRANT SELECT ON public.v_booking_status TO anon;

-- Add comment
COMMENT ON VIEW public.v_booking_status IS 'Booking status with ALL required columns for invoice generation - COMPREHENSIVE FIX';

-- Test the view
SELECT '✅ v_booking_status view fixed with ALL required columns!' as status;
SELECT COUNT(*) as total_bookings FROM public.v_booking_status;

-- Show sample data to verify columns exist
SELECT 
    booking_id,
    service_title,
    service_description,
    client_name,
    client_company,
    provider_name,
    provider_company
FROM public.v_booking_status 
LIMIT 3;
