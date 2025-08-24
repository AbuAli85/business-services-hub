-- Migration: Fix profile creation system (complements migration 023)
-- This migration fixes issues with the existing profile creation system
-- and ensures proper RLS policies for profile creation during signup

-- 1. Update the existing create_user_profile function to handle the new signature
-- (Migration 023 created a 3-parameter version, we need a 5-parameter version)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT DEFAULT '',
  user_role TEXT DEFAULT 'client',
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Profile already exists',
      'user_id', user_id
    );
  END IF;

  -- Insert new profile
  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    COALESCE(user_role, 'client')::user_role,
    COALESCE(full_name, ''),
    COALESCE(phone, ''),
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'user_id', user_id,
    'profile_id', user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to create profile: ' || SQLERRM,
      'user_id', user_id,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update RLS policies on profiles table to be more permissive during signup
-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create a more permissive insert policy that allows profile creation during signup
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        -- Allow service role to create profiles during signup
        (auth.role() = 'service_role') OR
        -- Allow the function to create profiles
        (auth.role() IS NULL)
    );

-- 3. Ensure the profiles table has the correct structure
-- Add any missing columns that might be needed
DO $$
BEGIN
    -- Add country column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'country') THEN
        ALTER TABLE public.profiles ADD COLUMN country TEXT;
    END IF;
    
    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID;
    END IF;
    
    -- Add is_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 4. Create an index on profiles.id for better performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

-- 5. Update the process_profile_creation_webhooks function to use the new signature
CREATE OR REPLACE FUNCTION public.process_profile_creation_webhooks()
RETURNS INTEGER AS $$
DECLARE
  webhook_record RECORD;
  result JSONB;
  processed_count INTEGER := 0;
BEGIN
  -- Process pending webhook requests
  FOR webhook_record IN 
    SELECT * FROM public.profile_creation_webhooks 
    WHERE status = 'pending' AND attempts < 3
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Update status to processing
      UPDATE public.profile_creation_webhooks 
      SET status = 'processing', attempts = attempts + 1
      WHERE id = webhook_record.id;

      -- Try to create profile using the updated function signature
      result := public.create_user_profile(
        webhook_record.user_id,
        webhook_record.user_email,
        webhook_record.user_role,
        webhook_record.full_name,
        webhook_record.phone
      );

      -- Update status based on result
      IF (result->>'success')::boolean THEN
        UPDATE public.profile_creation_webhooks 
        SET status = 'completed', processed_at = NOW()
        WHERE id = webhook_record.id;
        processed_count := processed_count + 1;
      ELSE
        UPDATE public.profile_creation_webhooks 
        SET status = 'failed', error_message = result->>'message'
        WHERE id = webhook_record.id;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Update status to failed
        UPDATE public.profile_creation_webhooks 
        SET status = 'failed', error_message = SQLERRM
        WHERE id = webhook_record.id;
    END;
  END LOOP;

  RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions (only if not already granted)
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 7. Add comments for documentation
COMMENT ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT, TEXT) IS 'Creates a user profile with the given parameters (updated version)';
COMMENT ON FUNCTION public.process_profile_creation_webhooks() IS 'Processes pending profile creation webhook requests (updated version)';

-- 8. Final verification
DO $$
BEGIN
    RAISE NOTICE 'Migration 024_fix_profile_creation_trigger completed successfully';
    RAISE NOTICE 'Profile creation function updated to handle webhook data properly';
    RAISE NOTICE 'RLS policies updated to allow profile creation during signup';
    RAISE NOTICE 'Profiles table structure verified and updated if needed';
    RAISE NOTICE 'Webhook processing function updated to use new function signature';
    RAISE NOTICE 'NOTE: Configure Supabase webhook to call your API endpoint for automatic profile creation';
END $$;
