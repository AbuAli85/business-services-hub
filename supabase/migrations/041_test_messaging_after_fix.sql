-- Migration: Test Messaging After Profile Fix
-- Date: December 2024
-- Description: Test that messaging now works for the previously failing user

-- Verify the fix worked
SELECT 'Profile sync status:' as info;
SELECT 
    COUNT(*) as auth_users,
    (SELECT COUNT(*) FROM profiles) as profiles,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM profiles) THEN '✅ SYNCED'
        ELSE '❌ NOT SYNCED'
    END as sync_status
FROM auth.users;

-- Test messaging for the user who was failing
DO $$
DECLARE
    test_user_id UUID := '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b';
    test_booking_id UUID;
    test_message_id UUID;
BEGIN
    RAISE NOTICE '🧪 Testing messaging functionality for user % (chairman@falconeyegroup.net)', test_user_id;
    
    -- Check if user now has a profile
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = test_user_id) THEN
        RAISE NOTICE '❌ User still has no profile - this is a problem';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ User now has a profile';
    
    -- Find a booking to use for testing
    SELECT id INTO test_booking_id 
    FROM bookings 
    LIMIT 1;
    
    IF test_booking_id IS NULL THEN
        RAISE NOTICE '❌ No bookings available for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found booking % for testing', test_booking_id;
    
    -- Try to create a test message
    INSERT INTO messages (sender_id, content, booking_id) 
    VALUES (test_user_id, '🎉 Test message after profile creation - messaging is now working!', test_booking_id)
    RETURNING id INTO test_message_id;
    
    RAISE NOTICE '✅ Successfully created test message %', test_message_id;
    
    -- Verify the message was created
    IF EXISTS (SELECT 1 FROM messages WHERE id = test_message_id) THEN
        RAISE NOTICE '✅ Message verified in database';
    ELSE
        RAISE NOTICE '❌ Message not found in database';
        RETURN;
    END IF;
    
    -- Clean up test message
    DELETE FROM messages WHERE id = test_message_id;
    RAISE NOTICE '✅ Cleaned up test message';
    
    RAISE NOTICE '🎉🎉🎉 MESSAGING TEST COMPLETED SUCCESSFULLY! 🎉🎉🎉';
    RAISE NOTICE 'The user can now send messages without foreign key errors!';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during messaging test: %', SQLERRM;
END $$;

-- Show current message count
SELECT 'Current messages in system:' as info, COUNT(*) as message_count FROM messages;
