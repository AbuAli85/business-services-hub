-- Simple Users & Profiles Sync Script
-- Run this in Supabase SQL Editor

-- Step 1: Create missing profiles
INSERT INTO profiles (id, role, full_name, phone, email, profile_completed, verification_status, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'role', 'client')::user_role,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    au.raw_user_meta_data->>'phone',
    au.email,
    COALESCE((au.raw_user_meta_data->>'profile_completed')::boolean, false),
    'approved',
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 2: Sync roles from auth to profiles
UPDATE profiles p
SET 
    role = (au.raw_user_meta_data->>'role')::user_role,
    updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
AND au.raw_user_meta_data->>'role' IS NOT NULL
AND au.raw_user_meta_data->>'role' != p.role::text
AND au.raw_user_meta_data->>'role' IN ('admin', 'provider', 'client', 'staff');

-- Step 3: Sync roles from profiles to auth (where auth role is missing)
UPDATE auth.users au
SET raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', p.role::text)
FROM profiles p
WHERE au.id = p.id
AND (au.raw_user_meta_data->>'role') IS NULL
AND p.role IS NOT NULL;

-- Step 4: Create sync function
CREATE OR REPLACE FUNCTION sync_profile_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.role != NEW.role) OR (TG_OP = 'INSERT') THEN
        UPDATE auth.users
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('role', NEW.role::text)
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON profiles;
CREATE TRIGGER sync_profile_role_trigger
    AFTER INSERT OR UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_role_to_auth();

-- Step 6: Create helper function
CREATE OR REPLACE FUNCTION get_user_with_role(user_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    role TEXT,
    full_name TEXT,
    phone TEXT,
    company_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.role::text,
        p.full_name,
        p.phone,
        p.company_name
    FROM profiles p
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Verify the fix
SELECT 
    'Total users' as metric,
    COUNT(*)::text as count
FROM auth.users
UNION ALL
SELECT 
    'Total profiles' as metric,
    COUNT(*)::text as count
FROM profiles
UNION ALL
SELECT 
    'Synced correctly' as metric,
    COUNT(*)::text as count
FROM auth.users au
INNER JOIN profiles p ON p.id = au.id
WHERE (au.raw_user_meta_data->>'role') = p.role::text;

-- Show your roles (replace email)
SELECT 
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role,
    CASE 
        WHEN (au.raw_user_meta_data->>'role') = p.role::text THEN 'Synced'
        ELSE 'Mismatch'
    END as status
FROM auth.users au
INNER JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

