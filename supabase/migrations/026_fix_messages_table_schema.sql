-- Migration: Fix Messages Table Schema
-- Date: December 2024
-- Description: Add missing columns to messages table to match application requirements

-- First, let's check what columns currently exist in the messages table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add receiver_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'receiver_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN receiver_id UUID;
        RAISE NOTICE 'Added receiver_id column to messages table';
    ELSE
        RAISE NOTICE 'receiver_id column already exists in messages table';
    END IF;

    -- Add read column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'read'
    ) THEN
        ALTER TABLE messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added read column to messages table';
    ELSE
        RAISE NOTICE 'read column already exists in messages table';
    END IF;

    -- Add subject column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'subject'
    ) THEN
        ALTER TABLE messages ADD COLUMN subject TEXT;
        RAISE NOTICE 'Added subject column to messages table';
    ELSE
        RAISE NOTICE 'subject column already exists in messages table';
    END IF;

    -- Add sender_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'sender_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN sender_id UUID;
        RAISE NOTICE 'Added sender_id column to messages table';
    ELSE
        RAISE NOTICE 'sender_id column already exists in messages table';
    END IF;
END $$;

-- Add foreign key constraints for the new columns
DO $$
BEGIN
    -- Add foreign key constraint for sender_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_sender_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_sender_id_fkey 
        FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for sender_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for sender_id already exists';
    END IF;

    -- Add foreign key constraint for receiver_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_receiver_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_receiver_id_fkey 
        FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for receiver_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for receiver_id already exists';
    END IF;
END $$;

-- Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Verify foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'messages';
