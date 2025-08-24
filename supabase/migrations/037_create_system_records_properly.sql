-- Migration: Create System Records Properly
-- Date: December 2024
-- Description: Create system records with all required fields for testing

-- First, let's check what columns actually exist in profiles table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check what columns actually exist in services table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'services' 
ORDER BY ordinal_position;

-- Check what columns actually exist in bookings table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

-- Check if we have any existing profiles we can use
SELECT id, full_name, role FROM profiles LIMIT 5;

-- Check if we have any existing services we can use
SELECT id, title, provider_id FROM services LIMIT 5;

-- Check if we have any existing bookings we can use
SELECT id, client_id, provider_id, service_id FROM bookings LIMIT 5;

-- Instead of creating system records, let's use existing data or create minimal required records
-- First, let's see if we can find any existing profile to use as a system user
DO $$
DECLARE
    existing_profile_id UUID;
    existing_service_id UUID;
    existing_booking_id UUID;
BEGIN
    -- Try to find an existing profile
    SELECT id INTO existing_profile_id FROM profiles LIMIT 1;
    
    IF existing_profile_id IS NOT NULL THEN
        RAISE NOTICE 'Found existing profile: %', existing_profile_id;
        
        -- Try to find an existing service for this profile
        SELECT id INTO existing_service_id FROM services WHERE provider_id = existing_profile_id LIMIT 1;
        
        IF existing_service_id IS NOT NULL THEN
            RAISE NOTICE 'Found existing service: %', existing_service_id;
            
            -- Try to find an existing booking for this service
            SELECT id INTO existing_booking_id FROM bookings WHERE service_id = existing_service_id LIMIT 1;
            
            IF existing_booking_id IS NOT NULL THEN
                RAISE NOTICE 'Found existing booking: %', existing_booking_id;
            ELSE
                RAISE NOTICE 'No existing booking found, will need to create one';
            END IF;
        ELSE
            RAISE NOTICE 'No existing service found, will need to create one';
        END IF;
    ELSE
        RAISE NOTICE 'No existing profiles found - system needs at least one user to be created first';
    END IF;
END $$;

-- Show current state of all tables
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'services' as table_name, COUNT(*) as record_count FROM services
UNION ALL
SELECT 'bookings' as table_name, COUNT(*) as record_count FROM bookings
UNION ALL
SELECT 'messages' as table_name, COUNT(*) as record_count FROM messages;
