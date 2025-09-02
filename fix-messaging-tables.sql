-- Quick fix for messaging tables
-- Run this in Supabase SQL Editor

-- 1. Create booking_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.booking_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    priority VARCHAR(10) DEFAULT 'normal',
    sender_role VARCHAR(20) NOT NULL,
    replied_to_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  -- Add booking_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'booking_messages_booking_id_fkey'
  ) THEN
    ALTER TABLE public.booking_messages 
    ADD CONSTRAINT booking_messages_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;

  -- Add sender_id foreign key to auth.users (not profiles)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'booking_messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.booking_messages 
    ADD CONSTRAINT booking_messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add foreign keys for reactions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'message_reactions_message_id_fkey'
  ) THEN
    ALTER TABLE public.message_reactions 
    ADD CONSTRAINT message_reactions_message_id_fkey 
    FOREIGN KEY (message_id) REFERENCES public.booking_messages(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'message_reactions_user_id_fkey'
  ) THEN
    ALTER TABLE public.message_reactions 
    ADD CONSTRAINT message_reactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id ON public.booking_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_sender_id ON public.booking_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_created_at ON public.booking_messages(created_at);

-- 6. Enable RLS
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
DROP POLICY IF EXISTS "Users can view messages for their bookings" ON public.booking_messages;
CREATE POLICY "Users can view messages for their bookings" ON public.booking_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_messages.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can send messages for their bookings" ON public.booking_messages;
CREATE POLICY "Users can send messages for their bookings" ON public.booking_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update messages for read receipts" ON public.booking_messages;
CREATE POLICY "Users can update messages for read receipts" ON public.booking_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_messages.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- 8. Reactions policies
DROP POLICY IF EXISTS "Users can view reactions" ON public.message_reactions;
CREATE POLICY "Users can view reactions" ON public.message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.booking_messages bm
            JOIN public.bookings b ON b.id = bm.booking_id
            WHERE bm.id = message_reactions.message_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions" ON public.message_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.booking_messages bm
            JOIN public.bookings b ON b.id = bm.booking_id
            WHERE bm.id = message_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.booking_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;

-- 10. Insert a test message (optional)
INSERT INTO public.booking_messages (booking_id, sender_id, content, sender_role, message_type)
SELECT 
    '8ccbb969-3639-4ff4-ae4d-722d9580db57'::UUID,
    auth.uid(),
    'Welcome to the enhanced messaging system! 🎉',
    'system',
    'system'
WHERE auth.uid() IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.booking_messages 
    WHERE booking_id = '8ccbb969-3639-4ff4-ae4d-722d9580db57'::UUID
    AND content LIKE '%Welcome to the enhanced messaging system%'
);

-- Success message
SELECT 'Messaging system tables created successfully!' as result;
