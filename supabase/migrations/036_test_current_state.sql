-- Migration: Test Current Messages State
-- Date: December 2024
-- Description: Test current state after system records are created

-- Check current schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check if system records exist (should be created by previous migration)
SELECT 'profiles' as table_name, id, full_name, role FROM profiles WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
UNION ALL
SELECT 'services' as table_name, id, title as name, status as role FROM services WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
UNION ALL
SELECT 'bookings' as table_name, id, status as name, currency as role FROM bookings WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Test a simple insert with only required fields
INSERT INTO messages (sender_id, content, booking_id) 
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, 
    'Test message from system',
    '00000000-0000-0000-0000-000000000000'::uuid
);

-- Verify the insert worked
SELECT id, sender_id, content, booking_id, created_at FROM messages WHERE content = 'Test message from system';

-- Clean up test data
DELETE FROM messages WHERE content = 'Test message from system';
