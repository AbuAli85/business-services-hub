-- Debug booking loading issue - check if v_booking_status view query is working
-- The page is showing "Loading..." which suggests the API call is failing or hanging

-- ==============================================
-- 1. TEST THE EXACT QUERY USED BY THE FRONTEND
-- ==============================================

-- This is the exact query from useBookingDetails.ts
SELECT 
    id,
    booking_title,
    service_id,
    service_title,
    service_description,
    service_category,
    client_id,
    client_name,
    client_email,
    client_company,
    client_avatar,
    provider_id,
    provider_name,
    provider_email,
    provider_company,
    provider_avatar,
    progress,
    total_milestones,
    completed_milestones,
    raw_status,
    approval_status,
    display_status,
    payment_status,
    invoice_status,
    invoice_id,
    amount_cents,
    amount,
    currency,
    created_at,
    updated_at,
    due_at,
    requirements,
    notes,
    scheduled_date,
    location
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 2. CHECK IF ALL REQUIRED COLUMNS EXIST
-- ==============================================

-- Check what columns actually exist in the view
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'v_booking_status' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==============================================
-- 3. TEST SIMPLER QUERY
-- ==============================================

-- Test with just basic columns
SELECT 
    id,
    booking_title,
    booking_status,
    progress,
    payment_status
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 4. CHECK IF VIEW EXISTS AND IS ACCESSIBLE
-- ==============================================

-- Check if view exists
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE viewname = 'v_booking_status' 
  AND schemaname = 'public';

-- ==============================================
-- 5. CHECK PERMISSIONS
-- ==============================================

-- Check permissions on the view
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'v_booking_status' 
  AND table_schema = 'public';

-- ==============================================
-- 6. TEST RAW BOOKINGS TABLE QUERY
-- ==============================================

-- Test querying the raw bookings table directly
SELECT 
    id,
    status,
    payment_status,
    project_progress,
    scheduled_date,
    created_at,
    updated_at
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
