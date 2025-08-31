-- Fix messages table read_at column
-- This migration ensures the messages table has the correct structure for the frontend

-- First, check if the messages table exists and has the correct structure
DO $$
BEGIN
    -- Check if messages table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        
        -- Check if read_at column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read_at') THEN
            -- Add read_at column
            ALTER TABLE public.messages ADD COLUMN read_at TIMESTAMPTZ;
            RAISE NOTICE 'Added read_at column to messages table';
        END IF;
        
        -- Check if receiver_id column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id') THEN
            -- Add receiver_id column
            ALTER TABLE public.messages ADD COLUMN receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added receiver_id column to messages table';
        END IF;
        
        -- Check if content column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content') THEN
            -- Add content column
            ALTER TABLE public.messages ADD COLUMN content TEXT;
            RAISE NOTICE 'Added content column to messages table';
        END IF;
        
        -- Check if created_at column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'created_at') THEN
            -- Add created_at column
            ALTER TABLE public.messages ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
            RAISE NOTICE 'Added created_at column to messages table';
        END IF;
        
        -- Check if booking_id column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'booking_id') THEN
            -- Add booking_id column
            ALTER TABLE public.messages ADD COLUMN booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added booking_id column to messages table';
        END IF;
        
        -- Make booking_id nullable since it's not always required for direct messaging
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'messages' 
            AND column_name = 'booking_id' AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE public.messages ALTER COLUMN booking_id DROP NOT NULL;
            RAISE NOTICE 'Made booking_id column nullable';
        END IF;
        
        RAISE NOTICE 'Messages table structure check completed';
    ELSE
        -- Create messages table if it doesn't exist
        CREATE TABLE public.messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
            content TEXT,
            booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
            attachments TEXT[],
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Created messages table with correct structure';
    END IF;
END $$;

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON messages;
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;

-- Create new RLS policies
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
    );

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (
        auth.uid() = sender_id OR
        auth.uid() = receiver_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
