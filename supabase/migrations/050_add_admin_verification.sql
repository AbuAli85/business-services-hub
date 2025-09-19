-- Add admin verification status to profiles table
DO $$
BEGIN
    -- Add verification status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verification_status') THEN
        ALTER TABLE public.profiles ADD COLUMN verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected'));
        RAISE NOTICE 'Added verification_status column to profiles table';
    END IF;

    -- Add admin notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_notes') THEN
        ALTER TABLE public.profiles ADD COLUMN admin_notes TEXT;
        RAISE NOTICE 'Added admin_notes column to profiles table';
    END IF;

    -- Add verified_at timestamp if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verified_at') THEN
        ALTER TABLE public.profiles ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added verified_at column to profiles table';
    END IF;

    -- Add verified_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'verified_by') THEN
        ALTER TABLE public.profiles ADD COLUMN verified_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added verified_by column to profiles table';
    END IF;

    -- Add profile_completed column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added profile_completed column to profiles table';
    END IF;
END $$;

-- Update existing profiles to have pending verification status
UPDATE public.profiles 
SET verification_status = 'pending' 
WHERE verification_status IS NULL;

-- Update existing profiles to mark as not completed if they don't have bio and location
UPDATE public.profiles 
SET profile_completed = FALSE 
WHERE bio IS NULL OR bio = '' OR location IS NULL OR location = '';

-- Update existing profiles to mark as completed if they have bio and location
UPDATE public.profiles 
SET profile_completed = TRUE 
WHERE bio IS NOT NULL AND bio != '' AND location IS NOT NULL AND location != '';

-- Create index for verification status queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed ON public.profiles(profile_completed);

-- RLS Policies for verification status
-- Allow users to read their own verification status
DROP POLICY IF EXISTS "Users can read own verification status" ON public.profiles;
CREATE POLICY "Users can read own verification status" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Allow admins to read all verification statuses
DROP POLICY IF EXISTS "Admins can read all verification statuses" ON public.profiles;
CREATE POLICY "Admins can read all verification statuses" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update verification status
DROP POLICY IF EXISTS "Admins can update verification status" ON public.profiles;
CREATE POLICY "Admins can update verification status" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow users to update their own profile completion status
DROP POLICY IF EXISTS "Users can update own profile completion" ON public.profiles;
CREATE POLICY "Users can update own profile completion" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
