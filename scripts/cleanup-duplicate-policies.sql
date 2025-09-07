-- Cleanup Duplicate RLS Policies for time_entries
-- This script removes all existing policies and creates clean, non-conflicting ones

-- 1. Drop ALL existing policies on time_entries table
DROP POLICY IF EXISTS "Allow access to own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert time entries for their bookings" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can view time entries for their bookings" ON public.time_entries;

-- 2. Create clean, single policies for each operation
-- SELECT policy - allows viewing time entries for bookings they're involved in
CREATE POLICY "time_entries_select_policy" ON public.time_entries
  FOR SELECT USING (
    auth.uid() = user_id OR
    booking_id IN (
      SELECT id FROM public.bookings 
      WHERE client_id = auth.uid() OR provider_id = auth.uid()
    )
  );

-- INSERT policy - allows providers to insert time entries for their bookings
CREATE POLICY "time_entries_insert_policy" ON public.time_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    booking_id IN (
      SELECT id FROM public.bookings 
      WHERE provider_id = auth.uid()
    )
  );

-- UPDATE policy - allows users to update their own time entries
CREATE POLICY "time_entries_update_policy" ON public.time_entries
  FOR UPDATE USING (
    auth.uid() = user_id AND
    booking_id IN (
      SELECT id FROM public.bookings 
      WHERE provider_id = auth.uid()
    )
  );

-- DELETE policy - allows users to delete their own time entries
CREATE POLICY "time_entries_delete_policy" ON public.time_entries
  FOR DELETE USING (
    auth.uid() = user_id AND
    booking_id IN (
      SELECT id FROM public.bookings 
      WHERE provider_id = auth.uid()
    )
  );

-- 3. Verify the cleanup
SELECT 
  'Cleaned Up Policies:' as info,
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'No conditions'
    ELSE 'Has conditions'
  END as has_conditions
FROM pg_policies 
WHERE tablename = 'time_entries' 
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 4. Test permissions
SELECT 
  'Permission Test Results:' as info,
  COUNT(*) as total_time_entries,
  COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as user_own_entries,
  COUNT(CASE WHEN booking_id IN (
    SELECT id FROM public.bookings 
    WHERE client_id = auth.uid() OR provider_id = auth.uid()
  ) THEN 1 END) as accessible_entries
FROM public.time_entries;

-- 5. Show final policy count
SELECT 
  'Final Policy Count:' as info,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
  COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
  COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
  COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE tablename = 'time_entries' 
  AND schemaname = 'public';
