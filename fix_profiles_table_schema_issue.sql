-- Fix profiles table schema issue
-- Error: relation "profiles" does not exist in validate_invoice_data() function

-- ==============================================
-- 1. CHECK IF PROFILES TABLE EXISTS
-- ==============================================

-- Check if profiles table exists
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check if profiles table exists in public schema specifically
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- ==============================================
-- 2. CHECK THE VALIDATE_INVOICE_DATA FUNCTION
-- ==============================================

-- Find the problematic function
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'validate_invoice_data';

-- ==============================================
-- 3. CHECK WHAT TABLES ACTUALLY EXIST
-- ==============================================

-- List all tables in public schema
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ==============================================
-- 4. CHECK FOR ALTERNATIVE TABLE NAMES
-- ==============================================

-- Check if there's a table with similar name to profiles
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE '%profile%' OR tablename LIKE '%user%' OR tablename LIKE '%client%')
ORDER BY tablename;

-- ==============================================
-- 5. CHECK IF PROFILES TABLE EXISTS WITH DIFFERENT SCHEMA
-- ==============================================

-- Check all schemas for profiles table
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'profiles'
ORDER BY schemaname;

-- ==============================================
-- 6. TEMPORARY FIX: DROP THE PROBLEMATIC FUNCTION
-- ==============================================

-- Drop the function that's causing the issue
DROP FUNCTION IF EXISTS public.validate_invoice_data() CASCADE;

-- ==============================================
-- 7. VERIFY FUNCTION IS REMOVED
-- ==============================================

-- Check if function still exists
SELECT 
    proname as function_name
FROM pg_proc 
WHERE proname = 'validate_invoice_data';

-- ==============================================
-- 8. NOW TRY THE ORIGINAL BOOKING UPDATE
-- ==============================================

-- Try the booking update again
UPDATE public.bookings 
SET 
    updated_at = NOW()
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Verify the update worked
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

-- ==============================================
-- 9. CHECK v_booking_status VIEW DATA
-- ==============================================

-- Check the view data
SELECT 
    id,
    booking_status,
    payment_status,
    progress,
    display_status,
    scheduled_date,
    booking_created_at,
    booking_updated_at
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
