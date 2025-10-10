-- Fix scheduled_date inconsistencies across all bookings
-- Issues found: scheduled_date same as or before created_at

-- ==============================================
-- 1. IDENTIFY ALL BOOKINGS WITH DATE ISSUES
-- ==============================================

-- Count total bookings with date issues
SELECT 
    COUNT(*) as total_bookings_with_date_issues
FROM public.bookings 
WHERE scheduled_date <= created_at;

-- Show all bookings with date issues
SELECT 
    id,
    status,
    payment_status,
    created_at::date as created_date,
    scheduled_date,
    CASE 
        WHEN scheduled_date < created_at::date THEN 'Before creation'
        WHEN scheduled_date = created_at::date THEN 'Same as creation'
        ELSE 'After creation'
    END as issue_type
FROM public.bookings 
WHERE scheduled_date <= created_at
ORDER BY created_at DESC;

-- ==============================================
-- 2. FIX ALL BOOKINGS WITH DATE ISSUES
-- ==============================================

-- Strategy: Set scheduled_date to be 1-3 days after created_at
-- This ensures logical date ordering and gives realistic scheduling

UPDATE public.bookings 
SET 
    scheduled_date = CASE 
        -- For bookings created today or recent, schedule 1 day ahead
        WHEN created_at::date >= CURRENT_DATE - INTERVAL '7 days' 
        THEN created_at::date + INTERVAL '1 day'
        -- For older bookings, schedule 2-3 days ahead based on status
        WHEN status IN ('approved', 'in_progress', 'completed')
        THEN created_at::date + INTERVAL '2 days'
        ELSE created_at::date + INTERVAL '1 day'
    END,
    updated_at = NOW()
WHERE scheduled_date <= created_at;

-- ==============================================
-- 3. VERIFY THE FIXES
-- ==============================================

-- Check that all date issues are resolved
SELECT 
    COUNT(*) as remaining_date_issues
FROM public.bookings 
WHERE scheduled_date <= created_at;

-- Show sample of fixed bookings
SELECT 
    id,
    status,
    payment_status,
    created_at::date as created_date,
    scheduled_date,
    updated_at,
    CASE 
        WHEN scheduled_date <= created_at::date THEN '❌ STILL WRONG'
        ELSE '✅ FIXED'
    END as fix_status
FROM public.bookings 
WHERE id IN (
    '6cca68de-ee2c-4635-b42d-09641ffbdc1f',
    '5c3f1125-fa0b-40c3-a5c7-af306b6a796b',
    '789c854b-2884-4ddc-bbdc-d7158908202a',
    'ff61e897-2a96-4ab5-af9e-80597a44a88e',
    'a89a8f68-d24f-4e58-b52f-454f23a81ee9',
    'c78a2132-cefc-4273-995f-b9673a22471c'
)
ORDER BY created_at DESC;

-- ==============================================
-- 4. CHECK PAYMENT STATUS CONSISTENCY
-- ==============================================

-- Also fix any completed bookings with pending payment
UPDATE public.bookings 
SET 
    payment_status = 'issued',
    updated_at = NOW()
WHERE status = 'completed' 
  AND payment_status = 'pending';

-- Verify payment status fixes
SELECT 
    status,
    payment_status,
    COUNT(*) as count
FROM public.bookings 
WHERE status = 'completed'
GROUP BY status, payment_status
ORDER BY payment_status;

-- ==============================================
-- 5. FINAL CONSISTENCY REPORT
-- ==============================================

SELECT 
    'Date Logic' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL FIXED'
        ELSE CONCAT('❌ ', COUNT(*), ' bookings still have date issues')
    END as status
FROM public.bookings 
WHERE scheduled_date <= created_at

UNION ALL

SELECT 
    'Payment Logic' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ ALL FIXED'
        ELSE CONCAT('❌ ', COUNT(*), ' completed bookings still have pending payment')
    END as status
FROM public.bookings 
WHERE status = 'completed' AND payment_status = 'pending';

-- ==============================================
-- 6. SUMMARY STATISTICS
-- ==============================================

SELECT 
    'Total Bookings' as metric,
    COUNT(*) as value
FROM public.bookings

UNION ALL

SELECT 
    'Bookings with Fixed Dates' as metric,
    COUNT(*) as value
FROM public.bookings 
WHERE updated_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    'Completed Bookings' as metric,
    COUNT(*) as value
FROM public.bookings 
WHERE status = 'completed'

UNION ALL

SELECT 
    'Completed with Proper Payment Status' as metric,
    COUNT(*) as value
FROM public.bookings 
WHERE status = 'completed' AND payment_status IN ('issued', 'paid', 'completed');
