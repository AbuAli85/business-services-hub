-- CRITICAL FIX: Update get_booking_display_status function to handle ALL status cases
-- This function is used by the booking_list_enhanced view

CREATE OR REPLACE FUNCTION public.get_booking_display_status(booking_status TEXT, progress_percentage INTEGER)
RETURNS TEXT AS $$
BEGIN
    -- ✅ CRITICAL FIX: Handle 100% progress FIRST, regardless of booking status
    IF progress_percentage = 100 THEN
        RETURN 'Completed';
    END IF;
    
    -- Then handle other cases
    IF booking_status = 'draft' THEN
        RETURN 'Not Started';
    ELSIF booking_status = 'pending_payment' THEN
        RETURN 'Pending Approval';
    ELSIF booking_status = 'paid' THEN
        IF progress_percentage = 0 THEN
            RETURN 'Approved';
        ELSIF progress_percentage > 0 AND progress_percentage < 100 THEN
            RETURN 'In Progress';
        ELSE
            RETURN 'Approved';
        END IF;
    ELSIF booking_status = 'in_progress' THEN
        RETURN 'In Progress';
    ELSIF booking_status = 'delivered' THEN
        RETURN 'Completed';
    ELSIF booking_status = 'completed' THEN
        RETURN 'Completed';
    ELSIF booking_status = 'cancelled' THEN
        RETURN 'Cancelled';
    ELSIF booking_status = 'disputed' THEN
        RETURN 'Disputed';
    ELSE
        RETURN 'Pending';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT '✅ get_booking_display_status function fixed!' as status;

-- Test with various scenarios
SELECT 
    'Test 1: in_progress with 100% progress' as test_case,
    public.get_booking_display_status('in_progress', 100) as result;

SELECT 
    'Test 2: paid with 100% progress' as test_case,
    public.get_booking_display_status('paid', 100) as result;

SELECT 
    'Test 3: completed with 100% progress' as test_case,
    public.get_booking_display_status('completed', 100) as result;
