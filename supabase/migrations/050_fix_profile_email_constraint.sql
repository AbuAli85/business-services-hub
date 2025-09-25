-- Migration: Fix Profile Email Constraint Issues
-- Description: Handle null email values and improve profile creation
-- Date: 2025-01-25

-- 1. First, update any existing profiles with null emails to use a placeholder
-- This prevents the NOT NULL constraint from failing
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

-- 3. Update the profile creation trigger to use safe email handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  safe_email TEXT;
BEGIN
  -- Ensure we have a valid email
  safe_email := COALESCE(NEW.email, 'user-' || NEW.id::text || '@placeholder.local');
  
  -- Insert into profiles table with proper error handling
  INSERT INTO public.profiles (
    id, 
    email,
    full_name, 
    role, 
    phone,
    company_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    safe_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    NOW(),
    NOW()
  );
  
  -- Log successful profile creation
  RAISE NOTICE 'Profile created successfully for user % with email % and role %', NEW.id, safe_email, COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate email case
    RAISE WARNING 'User with email % already exists in profiles table', safe_email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_safe(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 5. Update the existing create_user_profile function to use the safe version
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

-- 6. Create a function to fix existing profiles with placeholder emails
CREATE OR REPLACE FUNCTION public.fix_profile_emails()
RETURNS JSONB AS $$
DECLARE
  updated_count INTEGER := 0;
  profile_record RECORD;
BEGIN
  -- Update profiles with placeholder emails to use actual auth user emails
  FOR profile_record IN 
    SELECT p.id, p.email, au.email as auth_email
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE p.email LIKE '%@placeholder.local'
  LOOP
    IF profile_record.auth_email IS NOT NULL THEN
      UPDATE public.profiles 
      SET email = profile_record.auth_email
      WHERE id = profile_record.id;
      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile emails updated successfully',
    'updated_count', updated_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.fix_profile_emails() TO service_role;
