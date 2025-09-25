-- Quick fix for email constraint issues
-- This script handles the null email constraint violation

-- 1. Update any existing profiles with null emails to use a placeholder
UPDATE public.profiles 
SET email = COALESCE(email, 'user-' || id::text || '@placeholder.local')
WHERE email IS NULL;

-- 2. Create a function to safely create profiles with proper email handling
CREATE OR REPLACE FUNCTION public.create_user_profile_safe(
  user_id UUID,
  user_email TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'client',
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  safe_email TEXT;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Profile already exists',
      'user_id', user_id
    );
  END IF;

  -- Ensure we have a valid email
  safe_email := COALESCE(user_email, 'user-' || user_id::text || '@placeholder.local');

  -- Insert new profile with safe email
  INSERT INTO public.profiles (
    id,
    email,
    role,
    full_name,
    phone,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    safe_email,
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
    'profile_id', user_id,
    'email_used', safe_email
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
GRANT EXECUTE ON FUNCTION public.create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 4. Update the existing create_user_profile function to use the safe version
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id UUID,
  user_email TEXT DEFAULT NULL,
  user_role TEXT DEFAULT 'client',
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT ''
)
RETURNS JSONB AS $$
BEGIN
  RETURN public.create_user_profile_safe(user_id, user_email, user_role, full_name, phone);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
