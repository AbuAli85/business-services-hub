-- Force frontend data refresh by updating booking data again
-- This will trigger updated_at timestamp and force UI to fetch fresh data

-- ==============================================
-- 1. FORCE UPDATE TO TRIGGER FRONTEND REFRESH
-- ==============================================

-- Update the booking to force frontend to fetch fresh data
UPDATE public.bookings 
SET 
    updated_at = NOW(),
    -- Ensure payment_status is correct for completed booking
    payment_status = CASE 
        WHEN status = 'completed' AND payment_status = 'pending' 
        THEN 'issued' 
        ELSE payment_status 
    END
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 2. VERIFY THE CURRENT STATE
-- ==============================================

-- Check raw booking data
SELECT 
    id,
    status,
    payment_status,
    project_progress,
    updated_at
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Check v_booking_status view data
SELECT 
    id,
    booking_status,
    payment_status,
    progress,
    display_status,
    booking_updated_at
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 3. CHECK API RESPONSE DATA
-- ==============================================

-- Test what the API should return
SELECT 
    id,
    status,
    payment_status,
    progress_percentage,
    scheduled_date,
    created_at,
    updated_at
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
