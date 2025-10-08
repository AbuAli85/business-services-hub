-- STEP 2: Sync users and profiles
-- Run this AFTER running step 1

-- Verify enum values exist
SELECT 'Verifying enum values before sync:' as info;
SELECT enumlabel as role_value
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Create missing profiles
INSERT INTO profiles (id, role, full_name, phone, email, profile_completed, verification_status, created_at, updated_at)
SELECT 
    au.id,
    (CASE 
        WHEN au.raw_user_meta_data->>'role' = 'client' THEN 'client'
        WHEN au.raw_user_meta_data->>'role' = 'provider' THEN 'provider'
        WHEN au.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
        WHEN au.raw_user_meta_data->>'role' = 'staff' THEN 'staff'
        -- Map old enum values to new ones
        WHEN au.raw_user_meta_data->>'role' = 'manager' THEN 'provider'
        WHEN au.raw_user_meta_data->>'role' = 'user' THEN 'client'
        WHEN au.raw_user_meta_data->>'role' = 'viewer' THEN 'client'
        ELSE 'client'  -- Default
    END)::user_role,
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

-- Sync roles from auth to profiles
UPDATE profiles p
SET 
    role = (CASE 
        WHEN au.raw_user_meta_data->>'role' = 'client' THEN 'client'
        WHEN au.raw_user_meta_data->>'role' = 'provider' THEN 'provider'
        WHEN au.raw_user_meta_data->>'role' = 'admin' THEN 'admin'
        WHEN au.raw_user_meta_data->>'role' = 'staff' THEN 'staff'
        ELSE p.role::text  -- Keep existing
    END)::user_role,
    updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
AND au.raw_user_meta_data->>'role' IS NOT NULL
AND au.raw_user_meta_data->>'role' IN ('admin', 'provider', 'client', 'staff')
AND au.raw_user_meta_data->>'role' != p.role::text;

-- Sync roles from profiles to auth (where auth role is missing)
UPDATE auth.users au
SET raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', p.role::text)
FROM profiles p
WHERE au.id = p.id
AND (au.raw_user_meta_data->>'role') IS NULL
AND p.role IS NOT NULL;

-- Create sync function
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

-- Create trigger
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON profiles;
CREATE TRIGGER sync_profile_role_trigger
    AFTER INSERT OR UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_role_to_auth();

-- Verify the sync
SELECT '✅ Sync completed!' as status;

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

-- Show all users with their roles
SELECT 
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role::text as profile_role,
    CASE 
        WHEN p.id IS NULL THEN '❌ No profile'
        WHEN (au.raw_user_meta_data->>'role') = p.role::text THEN '✅'
        ELSE '⚠️ Mismatch'
    END as status,
    CASE 
        WHEN p.role::text IN ('provider', 'admin') THEN '✅ Can create services'
        ELSE 'Cannot create services'
    END as access
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC;

