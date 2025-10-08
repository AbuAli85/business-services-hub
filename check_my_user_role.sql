-- ============================================================================
-- CHECK YOUR USER ROLE
-- ============================================================================
-- Run this to check your user's role status
-- Replace 'your-email@example.com' with your actual email
-- ============================================================================

-- Method 1: Check by email
-- ============================================================================
SELECT 
    au.id as user_id,
    au.email,
    au.created_at as account_created,
    au.email_confirmed_at as email_verified,
    au.raw_user_meta_data->>'role' as auth_role,
    au.raw_user_meta_data->>'full_name' as auth_full_name,
    p.id as profile_id,
    p.role as profile_role,
    p.full_name as profile_full_name,
    p.email as profile_email,
    p.company_name,
    p.profile_completed,
    p.verification_status,
    CASE 
        WHEN p.id IS NULL THEN '❌ PROFILE MISSING - Run fix_users_profiles_sync.sql'
        WHEN (au.raw_user_meta_data->>'role') IS NULL THEN '⚠️ NO ROLE IN AUTH - Run fix_users_profiles_sync.sql'
        WHEN (au.raw_user_meta_data->>'role') != p.role::text THEN '❌ ROLE MISMATCH - Auth: ' || (au.raw_user_meta_data->>'role') || ', Profile: ' || p.role::text || ' - Run fix_users_profiles_sync.sql'
        WHEN p.role = 'provider' THEN '✅ PROVIDER ROLE - Should have access to /dashboard/provider/create-service'
        WHEN p.role = 'client' THEN '⚠️ CLIENT ROLE - Need to change role to provider'
        WHEN p.role = 'admin' THEN '✅ ADMIN ROLE - Has full access'
        ELSE '✅ ROLES MATCH'
    END as status,
    CASE 
        WHEN p.role = 'provider' OR p.role = 'admin' THEN '✅ YES'
        ELSE '❌ NO - Role must be "provider" or "admin"'
    END as can_create_services
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email = 'your-email@example.com'  -- ⚠️ REPLACE THIS WITH YOUR EMAIL
ORDER BY au.created_at DESC;

-- Method 2: Check all users (to find yours)
-- ============================================================================
-- Uncomment this section if you don't know your email or want to see all users
/*
SELECT 
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role,
    CASE 
        WHEN p.id IS NULL THEN '❌ MISSING PROFILE'
        WHEN (au.raw_user_meta_data->>'role') != p.role::text THEN '❌ MISMATCH'
        WHEN p.role IN ('provider', 'admin') THEN '✅ CAN CREATE SERVICES'
        ELSE '⚠️ CLIENT'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC;
*/

-- Quick fix if you need to change your role to provider
-- ============================================================================
-- Uncomment and run this if you need to change your role to 'provider'
/*
DO $$
DECLARE
    user_email TEXT := 'your-email@example.com';  -- ⚠️ REPLACE THIS
    user_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RAISE NOTICE '❌ User not found with email: %', user_email;
        RETURN;
    END IF;
    
    -- Update profile role
    UPDATE profiles
    SET role = 'provider'
    WHERE id = user_id;
    
    -- Update auth metadata
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object('role', 'provider')
    WHERE id = user_id;
    
    RAISE NOTICE '✅ Updated user % to provider role', user_email;
    RAISE NOTICE 'Please sign out and sign back in to apply changes';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;
*/

