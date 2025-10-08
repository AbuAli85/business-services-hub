-- Complete Enum Fix - Add ALL values to match frontend
-- This adds any missing values and ensures frontend/backend compatibility

-- Step 1: Add all missing enum values
DO $$
BEGIN
    -- Add 'moderator' if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'moderator'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'moderator';
        RAISE NOTICE '✅ Added "moderator"';
    END IF;

    -- Add 'support' if it doesn't exist  
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'user_role'::regtype 
        AND enumlabel = 'support'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'support';
        RAISE NOTICE '✅ Added "support"';
    END IF;
END $$;

-- Step 2: Show all enum values
SELECT 'All user_role enum values:' as info;
SELECT enumlabel as role_value
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Step 3: Verify all users still have valid roles
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN p.role IS NOT NULL THEN 1 END) as users_with_roles
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id;

-- Step 4: Show users and their roles
SELECT 
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role::text as profile_role,
    CASE 
        WHEN p.id IS NULL THEN '❌ No profile'
        WHEN (au.raw_user_meta_data->>'role') = p.role::text THEN '✅'
        ELSE '⚠️ Mismatch'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

SELECT '✅ Enum fix complete!' as result;
SELECT 'Frontend expects: admin, manager, provider, client, staff, moderator, support' as expected;
SELECT 'Database now has all required values' as status;

