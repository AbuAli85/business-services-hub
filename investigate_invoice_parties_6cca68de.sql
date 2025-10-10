-- Comprehensive investigation of provider and client details for invoice template
-- Booking ID: 6cca68de-ee2c-4635-b42d-09641ffbdc1f
-- Purpose: Understand why invoice template shows placeholder data

-- ==============================================
-- 1. BOOKING BASIC INFO
-- ==============================================
SELECT 
    '=== BOOKING BASIC INFO ===' as section,
    id,
    client_id,
    provider_id,
    service_id,
    status,
    total_amount,
    currency,
    created_at
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 2. CLIENT PROFILE DETAILS
-- ==============================================
SELECT 
    '=== CLIENT PROFILE ===' as section,
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.company_name,
    p.role,
    p.avatar_url,
    p.created_at
FROM public.bookings b
JOIN public.profiles p ON p.id = b.client_id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 3. CLIENT COMPANY DETAILS (if exists)
-- ==============================================
-- First, try to find company by matching owner/user
SELECT 
    '=== CLIENT COMPANY (by owner) ===' as section,
    c.id,
    c.name,
    c.address,
    c.phone,
    c.email,
    c.website,
    c.logo_url,
    c.owner_id,
    c.created_at
FROM public.bookings b
JOIN public.companies c ON c.owner_id = b.client_id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Also try to find company by company_name match
SELECT 
    '=== CLIENT COMPANY (by name match) ===' as section,
    c.id,
    c.name,
    c.address,
    c.phone,
    c.email,
    c.website,
    c.logo_url,
    p.company_name as profile_company_name
FROM public.bookings b
JOIN public.profiles p ON p.id = b.client_id
LEFT JOIN public.companies c ON c.name = p.company_name
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 4. PROVIDER PROFILE DETAILS
-- ==============================================
SELECT 
    '=== PROVIDER PROFILE ===' as section,
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.company_name,
    p.role,
    p.avatar_url,
    p.created_at
FROM public.bookings b
JOIN public.profiles p ON p.id = b.provider_id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 5. PROVIDER COMPANY DETAILS (if exists)
-- ==============================================
-- First, try to find company by matching owner/user
SELECT 
    '=== PROVIDER COMPANY (by owner) ===' as section,
    c.id,
    c.name,
    c.address,
    c.phone,
    c.email,
    c.website,
    c.logo_url,
    c.owner_id,
    c.created_at
FROM public.bookings b
JOIN public.companies c ON c.owner_id = b.provider_id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Also try to find company by company_name match
SELECT 
    '=== PROVIDER COMPANY (by name match) ===' as section,
    c.id,
    c.name,
    c.address,
    c.phone,
    c.email,
    c.website,
    c.logo_url,
    p.company_name as profile_company_name
FROM public.bookings b
JOIN public.profiles p ON p.id = b.provider_id
LEFT JOIN public.companies c ON c.name = p.company_name
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 6. SERVICE DETAILS
-- ==============================================
SELECT 
    '=== SERVICE INFO ===' as section,
    s.id,
    s.title,
    s.description,
    s.provider_id,
    s.base_price,
    s.currency,
    s.category
FROM public.bookings b
JOIN public.services s ON s.id = b.service_id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 7. INVOICE DETAILS (if exists)
-- ==============================================
SELECT 
    '=== INVOICE INFO ===' as section,
    i.id,
    i.invoice_number,
    i.booking_id,
    i.client_id,
    i.provider_id,
    i.amount,
    i.currency,
    i.status,
    i.due_date,
    i.created_at
FROM public.invoices i
WHERE i.booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 8. COMPANIES TABLE SCHEMA CHECK
-- ==============================================
-- Check what columns exist in companies table
SELECT 
    '=== COMPANIES TABLE SCHEMA ===' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'companies'
ORDER BY ordinal_position;

-- ==============================================
-- 9. PROFILES-COMPANIES RELATIONSHIP CHECK
-- ==============================================
-- Check if there's a foreign key relationship
SELECT 
    '=== PROFILE-COMPANY FK CHECK ===' as section,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'companies')
  AND tc.constraint_type = 'FOREIGN KEY';

-- ==============================================
-- 10. DIAGNOSIS SUMMARY
-- ==============================================
SELECT 
    '=== DIAGNOSIS SUMMARY ===' as section,
    CASE WHEN EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.profiles p ON p.id = b.client_id
        WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
          AND p.company_name IS NOT NULL AND p.company_name != ''
    ) THEN '✅ Client has company_name'
      ELSE '❌ Client missing company_name'
    END as client_company_name_status,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.companies c ON c.owner_id = b.client_id
        WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
    ) THEN '✅ Client has company record'
      ELSE '❌ Client missing company record'
    END as client_company_record_status,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.profiles p ON p.id = b.provider_id
        WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
          AND p.company_name IS NOT NULL AND p.company_name != ''
    ) THEN '✅ Provider has company_name'
      ELSE '❌ Provider missing company_name'
    END as provider_company_name_status,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.companies c ON c.owner_id = b.provider_id
        WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
    ) THEN '✅ Provider has company record'
      ELSE '❌ Provider missing company record'
    END as provider_company_record_status;

-- ==============================================
-- 11. ALL COMPANIES IN DATABASE (for reference)
-- ==============================================
SELECT 
    '=== ALL COMPANIES (top 10) ===' as section,
    id,
    name,
    owner_id,
    email,
    phone,
    website,
    CASE WHEN logo_url IS NOT NULL THEN '✅ Has Logo' ELSE '❌ No Logo' END as has_logo
FROM public.companies
ORDER BY created_at DESC
LIMIT 10;

