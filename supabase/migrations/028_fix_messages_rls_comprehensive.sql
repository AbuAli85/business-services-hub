-- Migration: Fix Messages Table RLS Comprehensive
-- Date: December 2024
-- Description: Comprehensive fix for messages table RLS policies

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

-- Check if any policies exist
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

-- Disable RLS temporarily to clean up
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable update for users based on email" ON messages;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON messages;

-- Re-enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies with proper naming
CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT
    USING (
        auth.uid()::text = sender_id::text OR 
        auth.uid()::text = receiver_id::text
    );

CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT
    WITH CHECK (
        auth.uid()::text = sender_id::text
    );

CREATE POLICY "messages_update_policy" ON messages
    FOR UPDATE
    USING (
        auth.uid()::text = sender_id::text OR 
        auth.uid()::text = receiver_id::text
    )
    WITH CHECK (
        auth.uid()::text = sender_id::text OR 
        auth.uid()::text = receiver_id::text
    );

CREATE POLICY "messages_delete_policy" ON messages
    FOR DELETE
    USING (
        auth.uid()::text = sender_id::text
    );

-- Verify the policies were created
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

-- Test RLS is working by checking if policies are active
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

-- Additional verification: Check if auth.uid() function exists and works
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'uid' 
AND routine_schema = 'auth';

-- Test a simple query to verify RLS is working
-- This should return the current user's UUID if authenticated
SELECT auth.uid() as current_user_id;
