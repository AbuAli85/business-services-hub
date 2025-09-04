-- Test simple function with status column
-- Date: January 2025
-- Description: Test if we can create a simple function that uses the status column

-- Test 1: Create a very simple function that uses status column
CREATE OR REPLACE FUNCTION test_status_column()
RETURNS TABLE(booking_id UUID, status_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as booking_id,
    b.status::text as status_text
  FROM public.bookings b
  LIMIT 5;
END;
$$;

-- Test 2: Try to call the function
SELECT * FROM test_status_column();

-- Test 3: Drop the test function
DROP FUNCTION IF EXISTS test_status_column();
