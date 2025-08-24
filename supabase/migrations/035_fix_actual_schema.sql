-- Migration: Fix Actual Messages Schema Issues
-- Date: December 2024
-- Description: Fix the real schema issues based on actual database state

-- First, let's see what columns actually exist NOW
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check what constraints actually exist
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'messages'
ORDER BY tc.constraint_type, kcu.column_name;

-- Check if we can make booking_id nullable (since it's causing issues)
-- Only if it's currently NOT NULL
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'booking_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE messages ALTER COLUMN booking_id DROP NOT NULL;
        RAISE NOTICE 'Made booking_id column nullable';
    ELSE
        RAISE NOTICE 'booking_id column is already nullable';
    END IF;
END $$;

-- Create a system booking for system messages if it doesn't exist
INSERT INTO bookings (id, client_id, provider_id, service_id, status, subtotal, currency)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'draft',
    0.00,
    'OMR'
) ON CONFLICT (id) DO NOTHING;

-- Create a system profile for system messages if it doesn't exist
INSERT INTO profiles (id, role, full_name, is_verified)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'admin',
    'System',
    true
) ON CONFLICT (id) DO NOTHING;

-- Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;
