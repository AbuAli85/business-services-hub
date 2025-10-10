-- Fix profile company_name to match actual company records
-- Booking: 6cca68de-ee2c-4635-b42d-09641ffbdc1f

-- ==============================================
-- 1. UPDATE CLIENT PROFILE
-- ==============================================
-- Client ID: 4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b
-- Current: company_name = "" (empty)
-- Should be: "falcon eye group" (matches the actual company owned by this user)

UPDATE public.profiles
SET 
    company_name = 'falcon eye group',
    updated_at = NOW()
WHERE id = '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b';

-- Verify the update
SELECT 
    id,
    full_name,
    company_name,
    email
FROM public.profiles
WHERE id = '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b';

-- ==============================================
-- 2. UPDATE PROVIDER PROFILE
-- ==============================================
-- Provider ID: d2ce1fe9-806f-4dbc-8efb-9cf160f19e4b
-- Current: company_name = "fahad alamri Services"
-- Should be: "smartPRO" (matches the actual company owned by this user)

UPDATE public.profiles
SET 
    company_name = 'smartPRO',
    updated_at = NOW()
WHERE id = 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b';

-- Verify the update
SELECT 
    id,
    full_name,
    company_name,
    email
FROM public.profiles
WHERE id = 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b';

-- ==============================================
-- 3. VERIFY THE COMPLETE RELATIONSHIP
-- ==============================================
SELECT 
    'After Fix - Complete View' as status,
    p.id as profile_id,
    p.full_name,
    p.company_name as profile_company_name,
    c.id as company_id,
    c.name as actual_company_name,
    c.email,
    c.phone,
    c.website,
    CASE WHEN c.logo_url IS NOT NULL THEN '✅' ELSE '❌' END as has_logo
FROM public.profiles p
LEFT JOIN public.companies c ON c.owner_id = p.id
WHERE p.id IN (
    '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b',  -- Client
    'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b'   -- Provider
)
ORDER BY p.full_name;

-- ==============================================
-- 4. TEST THE INVOICE QUERY
-- ==============================================
-- This simulates what the invoice template page query should return

SELECT 
    'Invoice Template Data Test' as test,
    b.id as booking_id,
    
    -- Client data
    client_profile.id as client_id,
    client_profile.full_name as client_name,
    client_profile.email as client_email,
    client_profile.company_name as client_company_name,
    client_company.name as client_actual_company,
    client_company.address as client_address,
    client_company.phone as client_phone,
    client_company.email as client_company_email,
    client_company.website as client_website,
    
    -- Provider data
    provider_profile.id as provider_id,
    provider_profile.full_name as provider_name,
    provider_profile.email as provider_email,
    provider_profile.company_name as provider_company_name,
    provider_company.name as provider_actual_company,
    provider_company.address as provider_address,
    provider_company.phone as provider_phone,
    provider_company.email as provider_company_email,
    provider_company.website as provider_website

FROM public.bookings b
LEFT JOIN public.profiles client_profile ON client_profile.id = b.client_id
LEFT JOIN public.companies client_company ON client_company.owner_id = b.client_id
LEFT JOIN public.profiles provider_profile ON provider_profile.id = b.provider_id
LEFT JOIN public.companies provider_company ON provider_company.owner_id = b.provider_id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

