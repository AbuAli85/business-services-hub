-- Test status column functionality
-- Date: January 2025
-- Description: Test that the status column works properly

-- Test 1: Check if status column exists and what values it has
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
  AND column_name = 'status';

-- Test 2: Check current status values in the table
SELECT 
  status,
  COUNT(*) as count
FROM public.bookings
GROUP BY status
ORDER BY count DESC;

-- Test 3: Test a simple query using the status column
SELECT 
  id,
  title,
  status,
  created_at
FROM public.bookings
LIMIT 5;

-- Test 4: Test the status column with text casting
SELECT 
  id,
  title,
  status::text as status_text,
  CASE 
    WHEN status::text IN ('in_progress', 'confirmed', 'pending', 'draft', 'pending_payment', 'paid') 
    THEN 'active' 
    ELSE 'inactive' 
  END as status_category
FROM public.bookings
LIMIT 5;
