-- Migration: Fix Email Uniqueness and Verification Issues
-- Description: Add email uniqueness constraint to profiles table and improve email verification
-- Date: 2024-12-19

-- 1. Add email column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to profiles table';
    ELSE
        RAISE NOTICE 'email column already exists in profiles table';
    END IF;
END $$;

-- 2. Add unique constraint on email in profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_unique'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
        RAISE NOTICE 'Added unique constraint on email in profiles table';
    ELSE
        RAISE NOTICE 'Unique constraint on email already exists in profiles table';
    END IF;
END $$;

-- 3. Update existing profiles with email from auth.users
UPDATE public.profiles 
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE public.profiles.id = auth_users.id
AND public.profiles.email IS NULL;

-- 4. Add NOT NULL constraint to email column
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'email'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
        RAISE NOTICE 'Set email column to NOT NULL in profiles table';
    ELSE
        RAISE NOTICE 'email column is already NOT NULL in profiles table';
    END IF;
END $$;

-- 5. Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 6. Update the profile creation trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    NOW(),
    NOW()
  );
  
  -- Log successful profile creation
  RAISE NOTICE 'Profile created successfully for user % with email % and role %', NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate email case
    RAISE WARNING 'User with email % already exists in profiles table', NEW.email;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to check if email exists in profiles
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = email_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- 9. Add RLS policy for email checking
CREATE POLICY "Allow email existence check" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- 10. Create function to get user by email
CREATE OR REPLACE FUNCTION public.get_user_by_email(email_to_find TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  phone TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role::TEXT,
    p.phone,
    p.company_name,
    p.created_at
  FROM public.profiles p
  WHERE p.email = email_to_find;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for email lookup
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO anon, authenticated;
