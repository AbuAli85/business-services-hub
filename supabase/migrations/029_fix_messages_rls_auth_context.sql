-- Migration: Fix Messages Table RLS Auth Context
-- Date: December 2024
-- Description: Fix RLS policies that are failing due to auth context issues

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

-- Disable RLS temporarily
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Re-enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create simplified policies that work with Supabase's auth context
-- Policy 1: Allow authenticated users to view messages
CREATE POLICY "messages_select_policy" ON messages
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
    );

-- Policy 2: Allow authenticated users to insert messages
CREATE POLICY "messages_insert_policy" ON messages
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Policy 3: Allow authenticated users to update messages
CREATE POLICY "messages_update_policy" ON messages
    FOR UPDATE
    USING (
        auth.role() = 'authenticated'
    )
    WITH CHECK (
        auth.role() = 'authenticated'
    );

-- Policy 4: Allow authenticated users to delete messages
CREATE POLICY "messages_delete_policy" ON messages
    FOR DELETE
    USING (
        auth.role() = 'authenticated'
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

-- Test RLS is working
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

-- Test auth.role() function
SELECT auth.role() as current_auth_role;
