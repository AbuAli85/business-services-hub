-- Fix data inconsistencies for booking #6cca68de
-- Issues identified:
-- 1. ❌ COMPLETED booking with PENDING payment
-- 2. ❌ Scheduled date before created date

-- ==============================================
-- 1. FIX PAYMENT STATUS FOR COMPLETED BOOKING
-- ==============================================

-- For a completed booking, payment status should not be 'pending'
-- Options: 'paid', 'issued', or 'completed'
-- Let's set it to 'issued' since there's an invoice for this booking

UPDATE public.bookings 
SET 
    payment_status = 'issued',
    updated_at = NOW()
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
  AND status = 'completed' 
  AND payment_status = 'pending';

-- Verify the change
SELECT 
    id,
    status,
    payment_status,
    updated_at
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 2. FIX SCHEDULED DATE LOGIC ERROR
-- ==============================================

-- Fix scheduled_date to be after created_at
-- We'll set it to be 1 day after creation date

UPDATE public.bookings 
SET 
    scheduled_date = created_at + INTERVAL '1 day',
    updated_at = NOW()
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
  AND scheduled_date < created_at;

-- Verify the change
SELECT 
    id,
    status,
    created_at,
    scheduled_date,
    updated_at,
    CASE 
        WHEN scheduled_date < created_at THEN '❌ STILL WRONG'
        ELSE '✅ FIXED'
    END as date_status
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 3. VERIFY v_booking_status VIEW REFLECTS CHANGES
-- ==============================================

SELECT 
    id,
    booking_id,
    booking_status,
    payment_status,
    progress,
    display_status,
    scheduled_date,
    booking_created_at,
    booking_updated_at
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 4. FINAL CONSISTENCY CHECK
-- ==============================================

SELECT 
    'Booking Status vs Payment' as issue,
    CASE 
        WHEN b.status = 'completed' AND b.payment_status = 'pending'
        THEN '❌ STILL HAS ISSUE'
        WHEN b.status = 'completed' AND b.payment_status IN ('issued', 'paid', 'completed')
        THEN '✅ FIXED'
        ELSE '✅ OK'
    END as status
FROM public.bookings b
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'

UNION ALL

SELECT 
    'Scheduled vs Created Date' as issue,
    CASE 
        WHEN b.scheduled_date < b.created_at
        THEN '❌ STILL HAS ISSUE'
        WHEN b.scheduled_date >= b.created_at
        THEN '✅ FIXED'
        ELSE '✅ OK'
    END as status
FROM public.bookings b
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 5. CHECK FOR SIMILAR ISSUES IN OTHER BOOKINGS
-- ==============================================

-- Find other completed bookings with pending payment
SELECT 
    id,
    status,
    payment_status,
    created_at
FROM public.bookings 
WHERE status = 'completed' 
  AND payment_status = 'pending'
  AND id != '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
LIMIT 5;

-- Find other bookings with scheduled_date before created_at
SELECT 
    id,
    status,
    created_at,
    scheduled_date,
    CASE 
        WHEN scheduled_date < created_at THEN '❌ WRONG'
        ELSE '✅ OK'
    END as date_status
FROM public.bookings 
WHERE scheduled_date < created_at
  AND id != '6cca68de-ee2c-4635-b42d-09641ffbdc1f'
LIMIT 5;
