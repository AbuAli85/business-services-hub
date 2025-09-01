-- Migration: Fix Messages Table Missing Columns
-- Description: Add missing message_type, status, priority, and other columns expected by the frontend
-- Date: 2024-12-20

-- Add message_type column to messages table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'video', 'file', 'image'));
        RAISE NOTICE 'Added message_type column to messages table';
    ELSE
        RAISE NOTICE 'message_type column already exists in messages table';
    END IF;
END $$;

-- Add status column to messages table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));
        RAISE NOTICE 'Added status column to messages table';
    ELSE
        RAISE NOTICE 'status column already exists in messages table';
    END IF;
END $$;

-- Add priority column to messages table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'priority'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent'));
        RAISE NOTICE 'Added priority column to messages table';
    ELSE
        RAISE NOTICE 'priority column already exists in messages table';
    END IF;
END $$;

-- Add updated_at column to messages table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to messages table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in messages table';
    END IF;
END $$;

-- Add tags column to messages table for categorization
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added tags column to messages table';
    ELSE
        RAISE NOTICE 'tags column already exists in messages table';
    END IF;
END $$;

-- Add scheduled_send column for scheduled messages
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'scheduled_send'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN scheduled_send TIMESTAMPTZ;
        RAISE NOTICE 'Added scheduled_send column to messages table';
    ELSE
        RAISE NOTICE 'scheduled_send column already exists in messages table';
    END IF;
END $$;

-- Add subject column if it doesn't exist (might be added by API but missing in schema)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'subject'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN subject TEXT;
        RAISE NOTICE 'Added subject column to messages table';
    ELSE
        RAISE NOTICE 'subject column already exists in messages table';
    END IF;
END $$;

-- Add read column (boolean version) if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'read'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added read column to messages table';
    ELSE
        RAISE NOTICE 'read column already exists in messages table';
    END IF;
END $$;

-- Improve the attachments column structure
DO $$ 
BEGIN
    -- Check if attachments column exists as TEXT[]
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'messages' 
        AND column_name = 'attachments'
        AND data_type = 'ARRAY'
    ) THEN
        RAISE NOTICE 'Attachments column already exists as array';
    ELSE
        -- Add or update attachments column
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'messages' 
            AND column_name = 'attachments'
        ) THEN
            -- Column exists but wrong type, alter it
            ALTER TABLE public.messages DROP COLUMN IF EXISTS attachments;
        END IF;
        
        ALTER TABLE public.messages ADD COLUMN attachments JSONB DEFAULT '[]';
        RAISE NOTICE 'Added/updated attachments column to messages table';
    END IF;
END $$;

-- Update existing messages with default values for new columns
UPDATE public.messages 
SET 
    message_type = COALESCE(message_type, 'text'),
    status = COALESCE(status, 'sent'),
    priority = COALESCE(priority, 'normal'),
    updated_at = COALESCE(updated_at, created_at, NOW()),
    read = COALESCE(read, FALSE)
WHERE 
    message_type IS NULL 
    OR status IS NULL 
    OR priority IS NULL 
    OR updated_at IS NULL 
    OR read IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON public.messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON public.messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_updated_at ON public.messages(updated_at);
CREATE INDEX IF NOT EXISTS idx_messages_tags ON public.messages USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_send ON public.messages(scheduled_send);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON public.messages USING GIN(attachments);

-- Create trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_messages_updated_at();

-- Update RLS policies to include new columns (if needed)
-- The existing policies should work with new columns

-- Grant permissions for new columns
GRANT SELECT ON public.messages TO anon;
GRANT ALL ON public.messages TO authenticated;

-- Add helpful comments for new columns
COMMENT ON COLUMN public.messages.message_type IS 'Type of message: text, voice, video, file, or image';
COMMENT ON COLUMN public.messages.status IS 'Message delivery status: sent, delivered, or read';
COMMENT ON COLUMN public.messages.priority IS 'Message priority level: normal, high, or urgent';
COMMENT ON COLUMN public.messages.updated_at IS 'Timestamp of last message modification';
COMMENT ON COLUMN public.messages.tags IS 'Array of tags for message categorization';
COMMENT ON COLUMN public.messages.scheduled_send IS 'Timestamp for scheduled message delivery';
COMMENT ON COLUMN public.messages.subject IS 'Message subject line for email-style messages';
COMMENT ON COLUMN public.messages.read IS 'Boolean flag indicating if message has been read';
COMMENT ON COLUMN public.messages.attachments IS 'JSON array of file attachments with metadata';

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Messages table missing columns fixed successfully!';
    RAISE NOTICE 'Added message_type, status, priority, and other missing columns';
    RAISE NOTICE 'Smart communication center should now work properly';
    RAISE NOTICE 'All existing messages updated with sensible defaults';
END $$;
