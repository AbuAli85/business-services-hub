-- ============================================================================
-- FIX USERS AND PROFILES SYNC
-- ============================================================================
-- This script ensures auth.users and profiles tables are properly linked
-- and have matching roles. It also creates triggers to keep them in sync.
-- ============================================================================

-- Step 1: Check current state
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 1: Checking Current State';
    RAISE NOTICE '==========================================';
END $$;

-- Count users vs profiles
SELECT 
    'Total auth.users' as metric,
    COUNT(*)::text as count
FROM auth.users
UNION ALL
SELECT 
    'Total profiles' as metric,
    COUNT(*)::text as count
FROM profiles
UNION ALL
SELECT 
    'Missing profiles' as metric,
    COUNT(*)::text as count
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Step 2: Show role mismatches
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 2: Checking Role Mismatches';
    RAISE NOTICE '==========================================';
END $$;

-- Find users where auth.users role != profiles role
SELECT 
    au.id as user_id,
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role,
    CASE 
        WHEN p.id IS NULL THEN '❌ MISSING PROFILE'
        WHEN (au.raw_user_meta_data->>'role') IS NULL THEN '⚠️ NO AUTH ROLE'
        WHEN p.role IS NULL THEN '⚠️ NO PROFILE ROLE'
        WHEN (au.raw_user_meta_data->>'role') != p.role::text THEN '❌ ROLE MISMATCH'
        ELSE '✅ ROLES MATCH'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY 
    CASE 
        WHEN p.id IS NULL THEN 1
        WHEN (au.raw_user_meta_data->>'role') != p.role::text THEN 2
        ELSE 3
    END;

-- Step 3: Create missing profiles
-- ============================================================================
DO $$
DECLARE
    auth_user_record RECORD;
    profiles_created INTEGER := 0;
    role_text TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 3: Creating Missing Profiles';
    RAISE NOTICE '==========================================';
    
    FOR auth_user_record IN 
        SELECT au.id, au.email, au.created_at, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN profiles p ON p.id = au.id
        WHERE p.id IS NULL
    LOOP
        BEGIN
            -- Extract role from metadata, default to 'client'
            role_text := COALESCE(
                auth_user_record.raw_user_meta_data->>'role',
                'client'
            );
            
            -- Ensure role is valid
            IF role_text NOT IN ('admin', 'provider', 'client', 'staff') THEN
                role_text := 'client';
            END IF;
            
            INSERT INTO profiles (
                id, 
                role, 
                full_name,
                phone,
                email,
                profile_completed,
                verification_status,
                created_at,
                updated_at
            ) VALUES (
                auth_user_record.id,
                role_text::user_role,
                COALESCE(
                    auth_user_record.raw_user_meta_data->>'full_name',
                    auth_user_record.email
                ),
                auth_user_record.raw_user_meta_data->>'phone',
                auth_user_record.email,
                COALESCE(
                    (auth_user_record.raw_user_meta_data->>'profile_completed')::boolean,
                    false
                ),
                'approved', -- Default to approved for existing users
                auth_user_record.created_at,
                NOW()
            );
            
            profiles_created := profiles_created + 1;
            RAISE NOTICE '✅ Created profile for % (%) with role %', 
                auth_user_record.email, 
                auth_user_record.id, 
                role_text;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Failed to create profile for % (%): %', 
                    auth_user_record.email, 
                    auth_user_record.id, 
                    SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Created % profiles', profiles_created;
END $$;

-- Step 4: Sync roles from auth.users to profiles
-- ============================================================================
DO $$
DECLARE
    user_record RECORD;
    roles_synced INTEGER := 0;
    auth_role TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 4: Syncing Roles from Auth to Profiles';
    RAISE NOTICE '==========================================';
    
    FOR user_record IN 
        SELECT 
            au.id, 
            au.email,
            au.raw_user_meta_data->>'role' as metadata_role,
            p.role as profile_role
        FROM auth.users au
        INNER JOIN profiles p ON p.id = au.id
        WHERE 
            -- Role exists in auth but doesn't match profile
            (au.raw_user_meta_data->>'role') IS NOT NULL
            AND (au.raw_user_meta_data->>'role') != p.role::text
    LOOP
        BEGIN
            auth_role := user_record.metadata_role;
            
            -- Validate role
            IF auth_role NOT IN ('admin', 'provider', 'client', 'staff') THEN
                RAISE NOTICE '⚠️ Invalid role % for %, skipping', auth_role, user_record.email;
                CONTINUE;
            END IF;
            
            -- Update profile role to match auth
            UPDATE profiles
            SET role = auth_role::user_role,
                updated_at = NOW()
            WHERE id = user_record.id;
            
            roles_synced := roles_synced + 1;
            RAISE NOTICE '✅ Synced role for %: % -> %', 
                user_record.email,
                user_record.profile_role,
                auth_role;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Failed to sync role for % (%): %', 
                    user_record.email, 
                    user_record.id, 
                    SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Synced % roles', roles_synced;
END $$;

-- Step 5: Sync roles from profiles to auth.users (where auth role is missing)
-- ============================================================================
DO $$
DECLARE
    user_record RECORD;
    roles_synced INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 5: Syncing Roles from Profiles to Auth';
    RAISE NOTICE '==========================================';
    
    FOR user_record IN 
        SELECT 
            au.id, 
            au.email,
            au.raw_user_meta_data,
            p.role as profile_role
        FROM auth.users au
        INNER JOIN profiles p ON p.id = au.id
        WHERE 
            -- Role missing in auth but exists in profile
            (au.raw_user_meta_data->>'role') IS NULL
            AND p.role IS NOT NULL
    LOOP
        BEGIN
            -- Update auth.users metadata with role from profile
            UPDATE auth.users
            SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
                jsonb_build_object('role', user_record.profile_role::text)
            WHERE id = user_record.id;
            
            roles_synced := roles_synced + 1;
            RAISE NOTICE '✅ Synced role to auth for %: %', 
                user_record.email,
                user_record.profile_role;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Failed to sync role to auth for % (%): %', 
                    user_record.email, 
                    user_record.id, 
                    SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Synced % roles to auth', roles_synced;
END $$;

-- Step 6: Create trigger to keep roles in sync
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 6: Creating Auto-Sync Trigger';
    RAISE NOTICE '==========================================';
END $$;

-- Function to sync role changes from profiles to auth.users
CREATE OR REPLACE FUNCTION sync_profile_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
    -- When profile role changes, update auth.users metadata
    IF (TG_OP = 'UPDATE' AND OLD.role != NEW.role) OR (TG_OP = 'INSERT') THEN
        UPDATE auth.users
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('role', NEW.role::text)
        WHERE id = NEW.id;
        
        RAISE NOTICE '✅ Synced role change for user % from profile to auth: %', NEW.id, NEW.role;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_profile_role_trigger ON profiles;

-- Create trigger
CREATE TRIGGER sync_profile_role_trigger
    AFTER INSERT OR UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_role_to_auth();

DO $$
BEGIN
    RAISE NOTICE '✅ Created trigger to auto-sync profile role changes to auth.users';
END $$;

-- Step 7: Create function to get user with synced role
-- ============================================================================
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

COMMENT ON FUNCTION get_user_with_role(UUID) IS 'Gets user profile with role - always uses profile role as source of truth';

-- Step 8: Final verification
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'STEP 8: Final Verification';
    RAISE NOTICE '==========================================';
END $$;

-- Show final state
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
    'Missing profiles' as metric,
    COUNT(*)::text as count
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
UNION ALL
SELECT 
    'Role mismatches' as metric,
    COUNT(*)::text as count
FROM auth.users au
INNER JOIN profiles p ON p.id = au.id
WHERE (au.raw_user_meta_data->>'role') != p.role::text
UNION ALL
SELECT 
    '✅ Properly synced' as metric,
    COUNT(*)::text as count
FROM auth.users au
INNER JOIN profiles p ON p.id = au.id
WHERE (au.raw_user_meta_data->>'role') = p.role::text;

-- Show sample of synced users
SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role,
    '✅' as status
FROM auth.users au
INNER JOIN profiles p ON p.id = au.id
WHERE (au.raw_user_meta_data->>'role') = p.role::text
ORDER BY au.created_at DESC
LIMIT 10;

-- Step 9: Summary
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ SYNC COMPLETE!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'What was done:';
    RAISE NOTICE '1. ✅ Created missing profiles for all auth.users';
    RAISE NOTICE '2. ✅ Synced roles from auth.users to profiles';
    RAISE NOTICE '3. ✅ Synced roles from profiles to auth.users (where missing)';
    RAISE NOTICE '4. ✅ Created trigger to keep roles in sync automatically';
    RAISE NOTICE '5. ✅ Created helper function get_user_with_role()';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Check the output above for any errors';
    RAISE NOTICE '2. Verify your user has the correct role';
    RAISE NOTICE '3. Try accessing /dashboard/provider/create-service again';
    RAISE NOTICE '';
    RAISE NOTICE 'To check a specific user role:';
    RAISE NOTICE 'SELECT * FROM get_user_with_role(''YOUR_USER_ID'');';
    RAISE NOTICE '';
END $$;

