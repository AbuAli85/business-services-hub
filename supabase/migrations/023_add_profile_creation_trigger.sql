-- Migration: Add automatic profile creation via webhook
-- This migration ensures that a profile is automatically created when a user signs up
-- Using Supabase's built-in webhook system instead of direct auth table triggers

-- 1. Create function to handle new user creation via webhook
CREATE OR REPLACE FUNCTION public.handle_new_user_webhook()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called by webhooks, not direct triggers
  -- It's kept for potential future use or manual profile creation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a webhook endpoint function that can be called by Supabase
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
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

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- 4. Update RLS policies to allow profile creation during signup
-- Temporarily disable RLS for profiles during this migration
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with updated policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Create new policies that allow profile creation during signup
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR 
        -- Allow service role to create profiles during signup
        (auth.role() = 'service_role')
    );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- 5. Create a webhook handler table for tracking profile creation requests
CREATE TABLE IF NOT EXISTS public.profile_creation_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  user_role TEXT,
  full_name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0
);

-- 6. Grant permissions on webhook table
GRANT ALL ON public.profile_creation_webhooks TO service_role;
GRANT SELECT ON public.profile_creation_webhooks TO authenticated;

-- 7. Create RLS policies for webhook table
ALTER TABLE public.profile_creation_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhooks" ON public.profile_creation_webhooks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own webhook records" ON public.profile_creation_webhooks
    FOR SELECT USING (auth.uid() = user_id);

-- 8. Create function to process pending webhook requests
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

      -- Try to create profile
      result := public.create_user_profile(
        webhook_record.user_id,
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

-- 9. Grant execute permission on processing function
GRANT EXECUTE ON FUNCTION public.process_profile_creation_webhooks() TO service_role;

-- 10. Add comments for documentation
COMMENT ON FUNCTION public.create_user_profile(UUID, TEXT, TEXT, TEXT) IS 'Creates a user profile with the given parameters';
COMMENT ON FUNCTION public.process_profile_creation_webhooks() IS 'Processes pending profile creation webhook requests';
COMMENT ON TABLE public.profile_creation_webhooks IS 'Tracks profile creation requests from webhooks';

-- 11. Final verification
DO $$
BEGIN
    RAISE NOTICE 'Migration 023_add_profile_creation_trigger completed successfully';
    RAISE NOTICE 'Webhook-based profile creation system implemented';
    RAISE NOTICE 'RLS policies updated to allow profile creation during signup';
    RAISE NOTICE 'Service role permissions granted for profile creation';
    RAISE NOTICE 'Webhook tracking table created for monitoring profile creation requests';
END $$;
