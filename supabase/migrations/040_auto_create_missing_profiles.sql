-- Migration: Auto-Create Missing Profiles
-- Date: December 2024
-- Description: Automatically create profiles for all auth users who don't have them

-- First, let's see the current state
SELECT 'Before fix:' as status, COUNT(*) as auth_users FROM auth.users
UNION ALL
SELECT 'Before fix:' as status, COUNT(*) as profiles FROM profiles;

-- Show which auth users are missing profiles
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Has Profile'
        ELSE 'Missing Profile'
    END as profile_status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC;

-- Create profiles for all auth users who don't have them
DO $$
DECLARE
    auth_user_record RECORD;
    profiles_created INTEGER := 0;
    profiles_skipped INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting to create missing profiles...';
    
    FOR auth_user_record IN 
        SELECT au.id, au.email, au.created_at
        FROM auth.users au
        LEFT JOIN profiles p ON p.id = au.id
        WHERE p.id IS NULL
    LOOP
        BEGIN
            INSERT INTO profiles (
                id, 
                role, 
                full_name, 
                is_verified, 
                email,
                created_at,
                updated_at
            ) VALUES (
                auth_user_record.id,
                'client', -- Default role
                COALESCE(auth_user_record.email, 'New User'), -- Use email as name if available
                false, -- Not verified by default
                auth_user_record.email,
                auth_user_record.created_at,
                NOW()
            );
            
            profiles_created := profiles_created + 1;
            RAISE NOTICE 'Created profile for user % (%)', auth_user_record.email, auth_user_record.id;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to create profile for user % (%): %', 
                    auth_user_record.email, auth_user_record.id, SQLERRM;
                profiles_skipped := profiles_skipped + 1;
        END;
    END LOOP;
    
    RAISE NOTICE 'Profile creation completed:';
    RAISE NOTICE '- Profiles created: %', profiles_created;
    RAISE NOTICE '- Profiles skipped: %', profiles_skipped;
    
END $$;

-- Show the final state
SELECT 'After fix:' as status, COUNT(*) as auth_users FROM auth.users
UNION ALL
SELECT 'After fix:' as status, COUNT(*) as profiles FROM profiles;

-- Verify all auth users now have profiles
SELECT 
    au.id as auth_user_id,
    au.email,
    au.created_at as auth_created,
    CASE 
        WHEN p.id IS NOT NULL THEN '✓ Has Profile'
        ELSE '✗ Missing Profile'
    END as profile_status,
    p.full_name,
    p.role
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
ORDER BY au.created_at DESC;

-- Test that we can now create a message for the user who was failing
DO $$
DECLARE
    test_user_id UUID := '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b';
    test_booking_id UUID;
    test_message_id UUID;
BEGIN
    RAISE NOTICE 'Testing messaging functionality for user %', test_user_id;
    
    -- Check if user now has a profile
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = test_user_id) THEN
        RAISE NOTICE '✗ User still has no profile - this is a problem';
        RETURN;
    END IF;
    
    RAISE NOTICE '✓ User now has a profile';
    
    -- Find a booking to use for testing
    SELECT id INTO test_booking_id 
    FROM bookings 
    LIMIT 1;
    
    IF test_booking_id IS NULL THEN
        RAISE NOTICE '✗ No bookings available for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE '✓ Found booking % for testing', test_booking_id;
    
    -- Try to create a test message
    INSERT INTO messages (sender_id, content, booking_id) 
    VALUES (test_user_id, 'Test message after profile creation', test_booking_id)
    RETURNING id INTO test_message_id;
    
    RAISE NOTICE '✓ Successfully created test message %', test_message_id;
    
    -- Clean up test message
    DELETE FROM messages WHERE id = test_message_id;
    RAISE NOTICE '✓ Cleaned up test message';
    
    RAISE NOTICE '🎉 Messaging test completed successfully! User can now send messages.';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during messaging test: %', SQLERRM;
END $$;
