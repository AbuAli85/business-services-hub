-- Force API cache refresh by updating booking data again
-- This will trigger updated_at timestamp and force UI refresh

-- Force update the booking to trigger cache refresh
UPDATE public.bookings 
SET 
    updated_at = NOW()
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Also update any related invoices
UPDATE public.invoices 
SET 
    updated_at = NOW()
WHERE booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Verify the current state
SELECT 
    'Current Database State' as check_type,
    b.status as booking_status,
    b.payment_status,
    b.project_progress,
    vbs.progress as view_progress,
    vbs.payment_status as view_payment_status,
    b.updated_at as last_updated
FROM public.bookings b
JOIN public.v_booking_status vbs ON b.id = vbs.id
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Check what the API should return
SELECT 
    id,
    booking_status,
    payment_status,
    progress,
    display_status,
    scheduled_date,
    booking_updated_at
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
