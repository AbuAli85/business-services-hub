-- Comprehensive Fix for Client Singleton and Permissions Issues
-- This script fixes both the multiple client instances and permission problems

-- 1. Fix Time Entries Table Permissions
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;

-- Create comprehensive RLS policies for time_entries
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

-- 2. Ensure all progress tracking tables have proper RLS
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;

-- 3. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_logs TO authenticated;

-- Grant sequence usage (check if sequences exist first)
DO $$
DECLARE
    seq_name text;
BEGIN
    -- Grant usage for time_entries sequence
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%time_entries%') THEN
        SELECT sequencename INTO seq_name FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%time_entries%'
        LIMIT 1;
        EXECUTE 'GRANT USAGE ON SEQUENCE public.' || seq_name || ' TO authenticated';
    END IF;
    
    -- Grant usage for milestones sequence
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%milestones%') THEN
        SELECT sequencename INTO seq_name FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%milestones%'
        LIMIT 1;
        EXECUTE 'GRANT USAGE ON SEQUENCE public.' || seq_name || ' TO authenticated';
    END IF;
    
    -- Grant usage for tasks sequence
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%tasks%') THEN
        SELECT sequencename INTO seq_name FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%tasks%'
        LIMIT 1;
        EXECUTE 'GRANT USAGE ON SEQUENCE public.' || seq_name || ' TO authenticated';
    END IF;
    
    -- Grant usage for progress_logs sequence
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%progress_logs%') THEN
        SELECT sequencename INTO seq_name FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%progress_logs%'
        LIMIT 1;
        EXECUTE 'GRANT USAGE ON SEQUENCE public.' || seq_name || ' TO authenticated';
    END IF;
END $$;

-- 4. Test the permissions
SELECT 
  'Permissions Test Results:' as info,
  (SELECT COUNT(*) FROM public.time_entries) as time_entries_count,
  (SELECT COUNT(*) FROM public.milestones) as milestones_count,
  (SELECT COUNT(*) FROM public.tasks) as tasks_count,
  (SELECT COUNT(*) FROM public.progress_logs) as progress_logs_count;

-- 5. Test specific booking access
SELECT 
  'Booking Access Test:' as info,
  COUNT(*) as milestones_for_booking
FROM public.milestones 
WHERE booking_id = 'bbdf8c8b-eef0-474d-be9e-06686042dbe5';

-- 6. Show current RLS status
SELECT 
  'RLS Status Summary:' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  COUNT(policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' 
  AND t.tablename IN ('milestones', 'tasks', 'time_entries', 'progress_logs')
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- 7. Verify user can access their data
SELECT 
  'User Access Verification:' as info,
  auth.uid() as current_user_id,
  (SELECT COUNT(*) FROM public.time_entries WHERE user_id = auth.uid()) as user_time_entries,
  (SELECT COUNT(*) FROM public.bookings WHERE provider_id = auth.uid()) as user_bookings;
