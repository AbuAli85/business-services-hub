-- Force refresh booking #6cca68de to clear any caching issues
-- This will trigger updated_at timestamps and force UI refresh

-- ==============================================
-- 1. FORCE UPDATE TO TRIGGER CACHE REFRESH
-- ==============================================

-- Update the booking to trigger updated_at timestamp
UPDATE public.bookings 
SET 
    updated_at = NOW()
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 2. VERIFY CURRENT STATE AFTER REFRESH
-- ==============================================

-- Check the updated booking data
SELECT 
    id,
    status,
    payment_status,
    project_progress,
    scheduled_date,
    created_at,
    updated_at,
    total_amount,
    currency
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Check v_booking_status view (should reflect changes)
SELECT 
    id,
    booking_id,
    booking_status,
    payment_status,
    progress,
    display_status,
    scheduled_date,
    booking_created_at,
    booking_updated_at,
    amount,
    currency
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 3. FORCE REFRESH ANY RELATED DATA
-- ==============================================

-- Update any related invoices to trigger cache refresh
UPDATE public.invoices 
SET 
    updated_at = NOW()
WHERE booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 4. VERIFY PROGRESS CALCULATION LOGIC
-- ==============================================

-- Double-check that progress calculation is working correctly
SELECT 
    'Progress Verification' as check_type,
    b.status as booking_status,
    b.project_progress as raw_progress,
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN COALESCE(b.project_progress, 50)
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as expected_progress,
    vbs.progress as view_progress,
    CASE 
        WHEN CASE 
            WHEN b.status = 'completed' THEN 100
            WHEN b.status = 'delivered' THEN 90
            WHEN b.status = 'in_progress' THEN COALESCE(b.project_progress, 50)
            WHEN b.status = 'paid' THEN 25
            WHEN b.status = 'pending_payment' THEN 10
            ELSE 0
        END = vbs.progress THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as progress_match
FROM public.bookings b
JOIN public.v_booking_status vbs ON b.id = vbs.id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 5. FINAL STATUS CHECK
-- ==============================================

SELECT 
    'Final Status Check' as check_type,
    CASE 
        WHEN b.status = 'completed' AND b.payment_status != 'pending'
        THEN '✅ Payment status correct'
        ELSE '❌ Payment status issue'
    END as payment_check,
    CASE 
        WHEN b.status = 'completed' AND vbs.progress = 100
        THEN '✅ Progress correct'
        ELSE '❌ Progress issue'
    END as progress_check,
    CASE 
        WHEN b.scheduled_date > b.created_at
        THEN '✅ Date logic correct'
        ELSE '❌ Date logic issue'
    END as date_check
FROM public.bookings b
JOIN public.v_booking_status vbs ON b.id = vbs.id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
