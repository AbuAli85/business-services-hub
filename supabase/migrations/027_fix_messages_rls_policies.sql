-- Migration: Fix Messages Table RLS Policies
-- Date: December 2024
-- Description: Add proper Row Level Security policies for messages table

-- First, check if RLS is enabled on the messages table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'messages';

-- Enable RLS if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Policy 1: Users can view messages where they are sender or receiver
CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Policy 2: Users can insert messages (send messages)
CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
    );

-- Policy 3: Users can update messages they sent (e.g., mark as read)
CREATE POLICY "Users can update their own messages" ON messages
    FOR UPDATE
    USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    )
    WITH CHECK (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id
    );

-- Policy 4: Users can delete messages they sent
CREATE POLICY "Users can delete their own messages" ON messages
    FOR DELETE
    USING (
        auth.uid() = sender_id
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
