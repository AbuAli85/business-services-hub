-- Check what columns actually exist in v_booking_status view
-- The frontend query is failing, so we need to see what columns are missing

-- ==============================================
-- 1. CHECK ALL COLUMNS IN THE VIEW
-- ==============================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'v_booking_status' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==============================================
-- 2. TEST THE FRONTEND QUERY STEP BY STEP
-- ==============================================

-- Test basic columns first
SELECT 
    id,
    booking_title,
    booking_status
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Test service columns
SELECT 
    id,
    service_id,
    service_title,
    service_description,
    service_category
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Test client columns
SELECT 
    id,
    client_id,
    client_name,
    client_email,
    client_company,
    client_avatar
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Test provider columns
SELECT 
    id,
    provider_id,
    provider_name,
    provider_email,
    provider_company,
    provider_avatar
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Test progress and status columns
SELECT 
    id,
    progress,
    total_milestones,
    completed_milestones,
    raw_status,
    approval_status,
    display_status,
    payment_status,
    invoice_status,
    invoice_id
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Test financial columns
SELECT 
    id,
    amount_cents,
    amount,
    currency
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Test date columns
SELECT 
    id,
    created_at,
    updated_at,
    due_at,
    scheduled_date
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';

-- Test additional columns
SELECT 
    id,
    requirements,
    notes,
    location
FROM public.v_booking_status 
WHERE id = '6cca68de-ee2c-4635-b42d-09641ffbdc1f';
