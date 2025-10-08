-- Fix user_role enum and sync users/profiles
-- This handles cases where the enum is missing values

-- Step 1: Check current enum values
SELECT 'Current enum values:' as info;
SELECT enumlabel as role_value
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Step 2: Add missing enum values if they don't exist
DO $$
BEGIN
    -- Add 'client' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'client'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'client';
        RAISE NOTICE 'Added "client" to user_role enum';
    END IF;

    -- Add 'staff' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'staff'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'staff';
        RAISE NOTICE 'Added "staff" to user_role enum';
    END IF;

    -- Add 'admin' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
        RAISE NOTICE 'Added "admin" to user_role enum';
    END IF;

    -- Add 'provider' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'provider'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'provider';
        RAISE NOTICE 'Added "provider" to user_role enum';
    END IF;
END $$;

-- Step 3: Show updated enum values
SELECT 'Updated enum values:' as info;
SELECT enumlabel as role_value
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Step 4: Now create missing profiles (using default 'provider' if client doesn't work)
INSERT INTO profiles (id, role, full_name, phone, email, profile_completed, verification_status, created_at, updated_at)
SELECT 
    au.id,
    CASE 
        WHEN au.raw_user_meta_data->>'role' = 'client' THEN 'client'::user_role
        WHEN au.raw_user_meta_data->>'role' = 'provider' THEN 'provider'::user_role
        WHEN au.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
        WHEN au.raw_user_meta_data->>'role' = 'staff' THEN 'staff'::user_role
        ELSE 'provider'::user_role  -- Default to provider if role is unknown
    END,
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

-- Step 5: Sync roles from auth to profiles (only if enum value exists)
UPDATE profiles p
SET 
    role = CASE 
        WHEN au.raw_user_meta_data->>'role' = 'client' THEN 'client'::user_role
        WHEN au.raw_user_meta_data->>'role' = 'provider' THEN 'provider'::user_role
        WHEN au.raw_user_meta_data->>'role' = 'admin' THEN 'admin'::user_role
        WHEN au.raw_user_meta_data->>'role' = 'staff' THEN 'staff'::user_role
        ELSE p.role  -- Keep existing role if unknown
    END,
    updated_at = NOW()
FROM auth.users au
WHERE p.id = au.id
AND au.raw_user_meta_data->>'role' IS NOT NULL
AND au.raw_user_meta_data->>'role' IN ('admin', 'provider', 'client', 'staff')
AND au.raw_user_meta_data->>'role' != p.role::text;

-- Step 6: Sync roles from profiles to auth
UPDATE auth.users au
SET raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', p.role::text)
FROM profiles p
WHERE au.id = p.id
AND (au.raw_user_meta_data->>'role') IS NULL
AND p.role IS NOT NULL;

-- Step 7: Create sync function
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

-- Step 8: Create trigger
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON profiles;
CREATE TRIGGER sync_profile_role_trigger
    AFTER INSERT OR UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_role_to_auth();

-- Step 9: Verify
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

-- Show status of all users
SELECT 
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role,
    CASE 
        WHEN (au.raw_user_meta_data->>'role') = p.role::text THEN '✅'
        ELSE '❌'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC;

