-- Migration: Finalize Messages Table Schema
-- Date: December 2024
-- Description: Ensure messages table has correct constraints and works with actual schema

-- First, let's see the current schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check current constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'messages'
ORDER BY tc.constraint_type, kcu.column_name;

-- Ensure we have the necessary foreign key constraints
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

    -- Add foreign key constraint for booking_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_booking_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT messages_booking_id_fkey 
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for booking_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for booking_id already exists';
    END IF;
END $$;

-- Create an index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver 
ON messages(sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(created_at DESC);

-- Verify the final state
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
    AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY kcu.column_name;
