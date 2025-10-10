-- Investigate booking #6cca68de data inconsistencies
-- From screenshot: booking_id = 6cca68de-ee2c-4635-b42d-09641ffbdc1f

-- 1. Check raw booking data
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

-- 2. Check v_booking_status view data
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

-- 3. Check if there are any related invoices
SELECT 
    id,
    booking_id,
    status as invoice_status,
    amount,
    created_at
FROM public.invoices 
WHERE booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- 4. Summary of inconsistencies
SELECT 
    'Booking Status vs Progress' as issue,
    CASE 
        WHEN b.status = 'completed' AND COALESCE(b.project_progress, 0) = 0 
        THEN '❌ COMPLETED booking with 0% progress'
        ELSE '✅ OK'
    END as status
FROM public.bookings b
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'

UNION ALL

SELECT 
    'Booking Status vs Payment' as issue,
    CASE 
        WHEN b.status = 'completed' AND b.payment_status = 'pending'
        THEN '❌ COMPLETED booking with PENDING payment'
        ELSE '✅ OK'
    END as status
FROM public.bookings b
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f'

UNION ALL

SELECT 
    'Scheduled vs Created Date' as issue,
    CASE 
        WHEN b.scheduled_date < b.created_at
        THEN '❌ Scheduled date before created date'
        ELSE '✅ OK'
    END as status
FROM public.bookings b
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
