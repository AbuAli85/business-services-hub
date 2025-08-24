-- Migration: Complete Messages Table Schema
-- Date: December 2024
-- Description: Add all missing columns to messages table to match application requirements

-- First, let's see what columns currently exist in the messages table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Add all missing columns to match the application requirements
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

    -- Make booking_id nullable since we're adding direct sender/receiver relationships
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'booking_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE messages ALTER COLUMN booking_id DROP NOT NULL;
        RAISE NOTICE 'Made booking_id column nullable';
    ELSE
        RAISE NOTICE 'booking_id column is already nullable or does not exist';
    END IF;
END $$;

-- Add foreign key constraints for the new columns
DO $$
BEGIN
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
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'messages';
