-- Fix Time Entries Table Permissions
-- This script ensures proper RLS policies for time_entries table

-- 1. Enable RLS on time_entries table
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;

-- 3. Create comprehensive RLS policies for time_entries
CREATE POLICY "Users can view their own time entries" ON public.time_entries
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT provider_id FROM public.bookings WHERE id = time_entries.booking_id
    ) OR
    auth.uid() IN (
      SELECT client_id FROM public.bookings WHERE id = time_entries.booking_id
    )
  );

CREATE POLICY "Users can insert their own time entries" ON public.time_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT provider_id FROM public.bookings WHERE id = time_entries.booking_id
    )
  );

CREATE POLICY "Users can update their own time entries" ON public.time_entries
  FOR UPDATE USING (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT provider_id FROM public.bookings WHERE id = time_entries.booking_id
    )
  );

CREATE POLICY "Users can delete their own time entries" ON public.time_entries
  FOR DELETE USING (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT provider_id FROM public.bookings WHERE id = time_entries.booking_id
    )
  );

-- 4. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;

-- Grant sequence usage (check if sequence exists first)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'time_entries_id_seq') THEN
        GRANT USAGE ON SEQUENCE public.time_entries_id_seq TO authenticated;
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%time_entries%') THEN
        -- Find the actual sequence name
        EXECUTE 'GRANT USAGE ON SEQUENCE public.' || (
            SELECT sequencename FROM pg_sequences 
            WHERE schemaname = 'public' AND sequencename LIKE '%time_entries%'
            LIMIT 1
        ) || ' TO authenticated';
    END IF;
END $$;

-- 5. Test the permissions
SELECT 
  'Time Entries Permissions Test:' as info,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as user_entries
FROM public.time_entries;

-- 6. Show current policies
SELECT 
  'Current RLS Policies:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'time_entries' 
  AND schemaname = 'public';
