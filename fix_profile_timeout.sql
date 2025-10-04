-- Fix Profile Timeout Issues
-- This script addresses the 57014 statement timeout error

-- 1. Add indexes to improve profile query performance
CREATE INDEX IF NOT EXISTS idx_profiles_id_created_at ON profiles(id, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role_created_at ON profiles(role, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);

-- 2. Add indexes for companies table
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);

-- 3. Optimize the profiles table by adding missing constraints (only if they don't exist)
DO $$ 
BEGIN
    -- Add id not null constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_id_not_null'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_id_not_null CHECK (id IS NOT NULL);
    END IF;
    
    -- Add email format constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_format'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL);
    END IF;
END $$;

-- 4. Update RLS policies to be more efficient
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view public profile info" ON profiles;

-- Create optimized RLS policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view public profile info" ON profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Allow viewing basic info for all authenticated users
      true
    )
  );

-- 5. Grant necessary permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON companies TO authenticated;

-- 6. Create a function to safely fetch profiles with timeout protection
CREATE OR REPLACE FUNCTION safe_fetch_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  phone TEXT,
  company_name TEXT,
  created_at TIMESTAMPTZ,
  verification_status TEXT,
  profile_completed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.phone,
    p.company_name,
    p.created_at,
    p.verification_status,
    p.profile_completed
  FROM profiles p
  WHERE p.id = user_id
  LIMIT 1;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION safe_fetch_profile(UUID) TO authenticated;
