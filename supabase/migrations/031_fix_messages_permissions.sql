-- Migration: Fix Messages Table Permissions
-- Date: December 2024
-- Description: Fix database permissions for messages table access

-- First, let's check the current state
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'RLS Enabled'
        ELSE 'RLS Disabled'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'messages';

-- Check current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- Check current permissions
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'messages'
ORDER BY grantee, privilege_type;

-- Grant explicit permissions to the authenticated role
-- This ensures that authenticated users can access the messages table
GRANT ALL PRIVILEGES ON TABLE messages TO authenticated;
GRANT ALL PRIVILEGES ON TABLE messages TO anon;

-- Grant usage on the schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on sequences if they exist
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Ensure the table owner has all permissions
ALTER TABLE messages OWNER TO postgres;

-- Verify permissions were granted
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'messages'
ORDER BY grantee, privilege_type;

-- Test that we can now access the messages table
-- This should work without permission issues
SELECT COUNT(*) as message_count FROM messages;

-- Test insert permission (using only existing columns)
INSERT INTO messages (sender_id, content, booking_id) 
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, 
    'This is a test message to verify permissions',
    '00000000-0000-0000-0000-000000000000'::uuid
);

-- Clean up test data
DELETE FROM messages WHERE content = 'This is a test message to verify permissions';

-- Final verification
SELECT COUNT(*) as final_message_count FROM messages;
