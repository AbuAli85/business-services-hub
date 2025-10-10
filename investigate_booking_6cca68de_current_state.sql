-- Investigate current state of booking #6cca68de after previous fixes
-- From screenshot: booking_id = 6cca68de-ee2c-4635-b42d-09641ffbdc1f

-- ==============================================
-- 1. CHECK RAW BOOKING DATA
-- ==============================================

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

-- ==============================================
-- 2. CHECK v_booking_status VIEW DATA
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
    booking_updated_at,
    amount,
    currency
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 3. CHECK RELATED INVOICES
-- ==============================================

SELECT 
    id,
    booking_id,
    status as invoice_status,
    amount,
    created_at
FROM public.invoices 
WHERE booking_id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 4. ANALYZE PROGRESS CALCULATION
-- ==============================================

-- Check what the v_booking_status view's progress calculation should be
SELECT 
    'Progress Calculation Analysis' as analysis_type,
    b.status as booking_status,
    b.project_progress as raw_progress,
    CASE 
        WHEN b.status = 'completed' THEN 100
        WHEN b.status = 'delivered' THEN 90
        WHEN b.status = 'in_progress' THEN COALESCE(b.project_progress, 50)
        WHEN b.status = 'paid' THEN 25
        WHEN b.status = 'pending_payment' THEN 10
        ELSE 0
    END as calculated_progress
FROM public.bookings b
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 5. CHECK FOR CACHING ISSUES
-- ==============================================

-- Check when the booking was last updated
SELECT 
    'Last Update Info' as info_type,
    updated_at,
    NOW() - updated_at as time_since_update,
    CASE 
        WHEN updated_at > NOW() - INTERVAL '1 hour' THEN 'Recently Updated'
        WHEN updated_at > NOW() - INTERVAL '1 day' THEN 'Updated Today'
        ELSE 'Updated Earlier'
    END as update_recency
FROM public.bookings 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- ==============================================
-- 6. SPECIFIC ISSUES ANALYSIS
-- ==============================================

SELECT 
    'Current Issues' as issue_type,
    CASE 
        WHEN b.status = 'completed' AND b.payment_status = 'pending'
        THEN '❌ COMPLETED booking with PENDING payment'
        ELSE '✅ Payment status OK'
    END as payment_issue,
    CASE 
        WHEN b.status = 'completed' AND COALESCE(b.project_progress, 0) = 0
        THEN '❌ COMPLETED booking with 0% progress'
        ELSE '✅ Progress OK'
    END as progress_issue
FROM public.bookings b
WHERE b.id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
