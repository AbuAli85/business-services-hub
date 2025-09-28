-- Test RPC call to calculate_booking_progress
-- This simulates what the application does

-- Test with the specific booking ID from your error
DO $$
DECLARE
  test_booking_id uuid := 'c08ba7e3-3518-4e9f-8802-8193c558856d';
  result INTEGER;
BEGIN
  RAISE NOTICE '🧪 TESTING RPC CALL to calculate_booking_progress';
  RAISE NOTICE '   Test booking ID: %', test_booking_id;
  
  -- Test the function call (simulating RPC)
  BEGIN
    SELECT calculate_booking_progress(test_booking_id) INTO result;
    RAISE NOTICE '✅ SUCCESS: RPC call works';
    RAISE NOTICE '   Result: %', result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ RPC call failed: %', SQLERRM;
      RAISE NOTICE '   Error code: %', SQLSTATE;
  END;
  
END $$;

-- Show function permissions
SELECT 
  'PERMISSIONS' as type,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';

-- Show function signature for RPC
SELECT 
  'RPC_SIGNATURE' as type,
  routine_name as function_name,
  specific_name as signature,
  data_type as return_type,
  'Use: supabase.rpc("calculate_booking_progress", { booking_id: "uuid" })' as usage
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'calculate_booking_progress';
