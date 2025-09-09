-- Add priority column to all notification tables that are missing it
-- Run this in your Supabase SQL Editor

-- Add priority column to booking_notifications if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_notifications' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE booking_notifications 
        ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;

-- Add priority column to user_notifications if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE user_notifications 
        ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;

-- Add priority column to progress_notifications if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'progress_notifications' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE progress_notifications 
        ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;

-- Add other common notification columns to all tables if missing
DO $$ 
BEGIN
    -- Add expires_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_notifications' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE booking_notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'progress_notifications' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE progress_notifications ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add action_url and action_label columns
DO $$ 
BEGIN
    -- Add action_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_notifications' 
        AND column_name = 'action_url'
    ) THEN
        ALTER TABLE booking_notifications ADD COLUMN action_url TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' 
        AND column_name = 'action_url'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN action_url TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'progress_notifications' 
        AND column_name = 'action_url'
    ) THEN
        ALTER TABLE progress_notifications ADD COLUMN action_url TEXT;
    END IF;
    
    -- Add action_label column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'booking_notifications' 
        AND column_name = 'action_label'
    ) THEN
        ALTER TABLE booking_notifications ADD COLUMN action_label VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notifications' 
        AND column_name = 'action_label'
    ) THEN
        ALTER TABLE user_notifications ADD COLUMN action_label VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'progress_notifications' 
        AND column_name = 'action_label'
    ) THEN
        ALTER TABLE progress_notifications ADD COLUMN action_label VARCHAR(100);
    END IF;
END $$;

-- Verify all tables now have priority column
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('booking_notifications', 'user_notifications', 'progress_notifications', 'notifications', 'notification_settings')
AND column_name = 'priority'
ORDER BY table_name;
