-- Migration: Check Messages Table Schema
-- Date: December 2024
-- Description: Check actual messages table structure and add missing columns

-- First, let's see what columns actually exist in the messages table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check if there's a 'content' column instead of 'message'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'content') 
        THEN 'content column exists'
        ELSE 'content column does not exist'
    END as content_column_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message') 
        THEN 'message column exists'
        ELSE 'message column does not exist'
    END as message_column_status;

-- Add the message column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'message'
    ) THEN
        ALTER TABLE messages ADD COLUMN message TEXT;
        RAISE NOTICE 'Added message column to messages table';
    ELSE
        RAISE NOTICE 'message column already exists in messages table';
    END IF;
END $$;

-- Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;
