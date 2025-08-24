-- Test script for migration 024
-- This script tests the key components that migration 024 will create/update

-- 1. Test if the profile_creation_webhooks table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_creation_webhooks') THEN
        RAISE NOTICE '✓ profile_creation_webhooks table exists';
    ELSE
        RAISE NOTICE '✗ profile_creation_webhooks table does not exist - migration 023 may not have run';
    END IF;
END $$;

-- 2. Test if the create_user_profile function exists and check its signature
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_user_profile') THEN
        RAISE NOTICE '✓ create_user_profile function exists';
        
        -- Check the function signature
        IF EXISTS (
            SELECT 1 FROM information_schema.parameters 
            WHERE specific_name IN (
                SELECT specific_name FROM information_schema.routines 
                WHERE routine_name = 'create_user_profile'
            ) 
            AND parameter_name = 'user_email'
        ) THEN
            RAISE NOTICE '✓ Function already has user_email parameter';
        ELSE
            RAISE NOTICE 'ℹ Function needs to be updated to include user_email parameter';
        END IF;
    ELSE
        RAISE NOTICE '✗ create_user_profile function does not exist - migration 023 may not have run';
    END IF;
END $$;

-- 3. Test if the process_profile_creation_webhooks function exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'process_profile_creation_webhooks') THEN
        RAISE NOTICE '✓ process_profile_creation_webhooks function exists';
    ELSE
        RAISE NOTICE '✗ process_profile_creation_webhooks function does not exist - migration 023 may not have run';
    END IF;
END $$;

-- 4. Check RLS policies on profiles table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles') THEN
        RAISE NOTICE '✓ RLS policies exist on profiles table';
        
        -- Check specific policies
        IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
            RAISE NOTICE '✓ Insert policy exists';
        ELSE
            RAISE NOTICE 'ℹ Insert policy needs to be created/updated';
        END IF;
    ELSE
        RAISE NOTICE 'ℹ No RLS policies found on profiles table';
    END IF;
END $$;

-- 5. Check if profiles table has required columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'country') THEN
        RAISE NOTICE '✓ country column exists';
    ELSE
        RAISE NOTICE 'ℹ country column will be added';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
        RAISE NOTICE '✓ company_id column exists';
    ELSE
        RAISE NOTICE 'ℹ company_id column will be added';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        RAISE NOTICE '✓ is_verified column exists';
    ELSE
        RAISE NOTICE 'ℹ is_verified column will be added';
    END IF;
END $$;

-- 6. Final recommendation
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION 024 READINESS CHECK ===';
    RAISE NOTICE 'If all checks show ✓, migration 024 should run without conflicts.';
    RAISE NOTICE 'If any checks show ✗, run migration 023 first.';
    RAISE NOTICE 'If any checks show ℹ, migration 024 will handle those items.';
    RAISE NOTICE '=====================================';
END $$;
