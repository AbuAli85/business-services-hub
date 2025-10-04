-- Test script to verify migration will work
-- This tests the key components without running the full migration

-- Test 1: Check if v_booking_status view exists and works
SELECT 'Test 1: v_booking_status view' as test_name;
SELECT COUNT(*) as booking_count FROM public.v_booking_status LIMIT 1;

-- Test 2: Check if we can create indexes on underlying tables
SELECT 'Test 2: Index creation on bookings table' as test_name;
CREATE INDEX IF NOT EXISTS test_idx_bookings_client_id ON public.bookings(client_id);
DROP INDEX IF EXISTS test_idx_bookings_client_id;

-- Test 3: Check if we can create indexes on profiles table
SELECT 'Test 3: Index creation on profiles table' as test_name;
CREATE INDEX IF NOT EXISTS test_idx_profiles_full_name ON public.profiles(full_name);
DROP INDEX IF EXISTS test_idx_profiles_full_name;

-- Test 4: Check if we can create indexes on services table
SELECT 'Test 4: Index creation on services table' as test_name;
CREATE INDEX IF NOT EXISTS test_idx_services_title ON public.services(title);
DROP INDEX IF EXISTS test_idx_services_title;

-- Test 5: Check if we can create indexes on milestones table
SELECT 'Test 5: Index creation on milestones table' as test_name;
CREATE INDEX IF NOT EXISTS test_idx_milestones_booking_id ON public.milestones(booking_id);
DROP INDEX IF EXISTS test_idx_milestones_booking_id;

-- Test 6: Check if we can create indexes on invoices table
SELECT 'Test 6: Index creation on invoices table' as test_name;
CREATE INDEX IF NOT EXISTS test_idx_invoices_booking_id ON public.invoices(booking_id);
DROP INDEX IF EXISTS test_idx_invoices_booking_id;

SELECT 'All tests completed successfully!' as result;
