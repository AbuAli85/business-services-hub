-- Debug and fix client company information
-- Check the current structure of profiles and companies tables

-- 1. Check if profiles table has company_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if companies table exists and has data
SELECT COUNT(*) as total_companies FROM public.companies;

-- 3. Check profiles with company relationships
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.company_id,
    c.name as company_name
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE p.id IN (
    SELECT DISTINCT client_id FROM public.bookings 
    WHERE id IN ('71a06a25-8925-4579-b55a-e141c96908fc', '5c3f1125-fa0b-40c3-a5c7-af306b6a796b', '789c854b-2884-4ddc-bbdc-d7158908202a')
)
LIMIT 10;

-- 4. Alternative: Check if client company info is stored differently
-- Maybe it's stored as a text field in profiles table?
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.company_name,  -- Check if this column exists
    p.company_id
FROM public.profiles p
WHERE p.id IN (
    SELECT DISTINCT client_id FROM public.bookings 
    WHERE id IN ('71a06a25-8925-4579-b55a-e141c96908fc', '5c3f1125-fa0b-40c3-a5c7-af306b6a796b', '789c854b-2884-4ddc-bbdc-d7158908202a')
)
LIMIT 10;
