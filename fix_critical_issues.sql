-- Fix critical issues identified in the logs
-- This script addresses the main problems without requiring a full migration

-- 1. Fix time_entries table permissions
-- First, ensure the table exists with correct structure
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "time_entries_providers_all" ON public.time_entries;
DROP POLICY IF EXISTS "time_entries_clients_read" ON public.time_entries;
DROP POLICY IF EXISTS "Providers manage time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Clients read time_entries" ON public.time_entries;

-- Create comprehensive RLS policies for time_entries
CREATE POLICY "time_entries_providers_all"
  ON public.time_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = time_entries.booking_id
        AND b.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = time_entries.booking_id
        AND b.provider_id = auth.uid()
    )
  );

CREATE POLICY "time_entries_clients_read"
  ON public.time_entries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = time_entries.booking_id
        AND b.client_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.time_entries TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 2. Fix milestones table permissions
CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "milestones_providers_all" ON public.milestones;
DROP POLICY IF EXISTS "milestones_clients_read" ON public.milestones;
DROP POLICY IF EXISTS "Providers manage milestones" ON public.milestones;
DROP POLICY IF EXISTS "Clients read milestones" ON public.milestones;

-- Create comprehensive RLS policies for milestones
CREATE POLICY "milestones_providers_all"
  ON public.milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = milestones.booking_id
        AND b.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = milestones.booking_id
        AND b.provider_id = auth.uid()
    )
  );

CREATE POLICY "milestones_clients_read"
  ON public.milestones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = milestones.booking_id
        AND b.client_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.milestones TO authenticated;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_entries_booking_id ON public.time_entries(booking_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_logged_at ON public.time_entries(logged_at);

CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON public.milestones(due_date);

-- 4. Fix profiles table permissions to prevent 500 errors
-- Ensure profiles table has proper RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "profiles_read_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;

-- 5. Test the fixes
DO $$
DECLARE
  test_booking_id UUID;
  test_user_id UUID;
BEGIN
  -- Get a test booking and user
  SELECT id INTO test_booking_id FROM public.bookings LIMIT 1;
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_booking_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testing time_entries access for booking % and user %', test_booking_id, test_user_id;
    
    -- Test if we can query time_entries
    PERFORM 1 FROM public.time_entries WHERE booking_id = test_booking_id LIMIT 1;
    RAISE NOTICE 'SUCCESS: time_entries query works';
    
    -- Test if we can query milestones
    PERFORM 1 FROM public.milestones WHERE booking_id = test_booking_id LIMIT 1;
    RAISE NOTICE 'SUCCESS: milestones query works';
    
    -- Test if we can query profiles
    PERFORM 1 FROM public.profiles WHERE id = test_user_id LIMIT 1;
    RAISE NOTICE 'SUCCESS: profiles query works';
  ELSE
    RAISE NOTICE 'No test data available, but policies have been created';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Policy test failed: %', SQLERRM;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.time_entries IS 'Time tracking entries for bookings';
COMMENT ON TABLE public.milestones IS 'Project milestones for bookings';
COMMENT ON POLICY "time_entries_providers_all" ON public.time_entries IS 'Providers can manage all time entries for their bookings';
COMMENT ON POLICY "time_entries_clients_read" ON public.time_entries IS 'Clients can read time entries for their bookings';
COMMENT ON POLICY "milestones_providers_all" ON public.milestones IS 'Providers can manage all milestones for their bookings';
COMMENT ON POLICY "milestones_clients_read" ON public.milestones IS 'Clients can read milestones for their bookings';
