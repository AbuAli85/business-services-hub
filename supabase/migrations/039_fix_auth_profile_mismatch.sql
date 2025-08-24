-- Migration: Fix Auth Profile Mismatch
-- Date: December 2024
-- Description: Investigate and fix mismatch between auth.users and profiles table

-- Check current state
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'auth.users' as table_name, COUNT(*) as record_count FROM auth.users;

-- Check if the current auth user exists in profiles
-- This will help us understand the mismatch
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created,
    p.id as profile_id,
    p.full_name,
    p.role,
    p.created_at as profile_created
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- Check profiles that don't have corresponding auth users
SELECT 
    p.id as profile_id,
    p.full_name,
    p.role,
    p.created_at,
    au.id as auth_user_id
FROM profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE au.id IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- Check if we can create a profile for the current auth user
-- First, let's see what the current auth user looks like
DO $$
DECLARE
    current_auth_user_id UUID := '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b';
    auth_user_exists BOOLEAN;
    profile_exists BOOLEAN;
BEGIN
    -- Check if auth user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = current_auth_user_id) INTO auth_user_exists;
    
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = current_auth_user_id) INTO profile_exists;
    
    RAISE NOTICE 'Auth user % exists: %', current_auth_user_id, auth_user_exists;
    RAISE NOTICE 'Profile for % exists: %', current_auth_user_id, profile_exists;
    
    IF auth_user_exists AND NOT profile_exists THEN
        RAISE NOTICE 'Creating missing profile for auth user %', current_auth_user_id;
        
        -- Try to create a profile for this auth user
        INSERT INTO profiles (id, role, full_name, is_verified)
        VALUES (current_auth_user_id, 'client', 'New User', false);
        
        RAISE NOTICE 'Profile created successfully';
        
    ELSIF NOT auth_user_exists THEN
        RAISE NOTICE 'Auth user % does not exist - this is a problem', current_auth_user_id;
    ELSE
        RAISE NOTICE 'Profile already exists for auth user %', current_auth_user_id;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating profile: %', SQLERRM;
END $$;

-- Show final state
SELECT 
    'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'auth.users' as table_name, COUNT(*) as record_count FROM auth.users;
