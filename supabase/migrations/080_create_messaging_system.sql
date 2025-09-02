-- Enhanced Messaging System Tables
-- This migration creates the complete messaging infrastructure

-- ============================================================================
-- 1. BOOKING MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.booking_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'template')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('client', 'provider', 'admin')),
    replied_to_id UUID REFERENCES public.booking_messages(id) ON DELETE SET NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. MESSAGE REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.booking_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL, -- emojis like '👍', '❤️', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction)
);

-- ============================================================================
-- 3. MESSAGE ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.booking_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Booking messages indexes
CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id ON public.booking_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_sender_id ON public.booking_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_created_at ON public.booking_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_booking_messages_message_type ON public.booking_messages(message_type);

-- Message reactions indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- Message attachments indexes
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. BOOKING MESSAGES POLICIES
-- ============================================================================

-- Users can view messages for bookings they're involved in
CREATE POLICY "Users can view messages for their bookings" ON public.booking_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_messages.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Users can insert messages for bookings they're involved in
CREATE POLICY "Users can send messages for their bookings" ON public.booking_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Users can update their own messages (for read receipts)
CREATE POLICY "Users can update their messages" ON public.booking_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_messages.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_messages.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- ============================================================================
-- 7. MESSAGE REACTIONS POLICIES
-- ============================================================================

-- Users can view reactions for messages they can see
CREATE POLICY "Users can view reactions for accessible messages" ON public.message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.booking_messages bm
            JOIN public.bookings b ON b.id = bm.booking_id
            WHERE bm.id = message_reactions.message_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Users can add reactions to messages they can see
CREATE POLICY "Users can react to accessible messages" ON public.message_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.booking_messages bm
            JOIN public.bookings b ON b.id = bm.booking_id
            WHERE bm.id = message_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions" ON public.message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- 8. MESSAGE ATTACHMENTS POLICIES
-- ============================================================================

-- Users can view attachments for messages they can see
CREATE POLICY "Users can view attachments for accessible messages" ON public.message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.booking_messages bm
            JOIN public.bookings b ON b.id = bm.booking_id
            WHERE bm.id = message_attachments.message_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Users can add attachments to messages in their bookings
CREATE POLICY "Users can add attachments to their booking messages" ON public.message_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.booking_messages bm
            JOIN public.bookings b ON b.id = bm.booking_id
            WHERE bm.id = message_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
            AND bm.sender_id = auth.uid()
        )
    );

-- ============================================================================
-- 9. TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for booking_messages
CREATE TRIGGER update_booking_messages_updated_at
    BEFORE UPDATE ON public.booking_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 10. FUNCTIONS FOR MESSAGING FEATURES
-- ============================================================================

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
    p_booking_id UUID,
    p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.booking_messages 
    SET read_at = NOW()
    WHERE booking_id = p_booking_id 
      AND sender_id != p_user_id 
      AND read_at IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION public.get_unread_message_count(
    p_booking_id UUID,
    p_user_id UUID
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.booking_messages
        WHERE booking_id = p_booking_id 
          AND sender_id != p_user_id 
          AND read_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.booking_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT SELECT, INSERT ON public.message_attachments TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 12. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- This will be commented out for production but useful for development
/*
-- Insert a sample message (uncomment for testing)
INSERT INTO public.booking_messages (booking_id, sender_id, content, sender_role, message_type, priority)
SELECT 
    '8ccbb969-3639-4ff4-ae4d-722d9580db57'::UUID, -- booking_id from the error
    auth.uid(), 
    'Welcome to the enhanced messaging system! 🎉', 
    'provider', 
    'system', 
    'normal'
WHERE auth.uid() IS NOT NULL;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE public.booking_messages IS 'Enhanced messaging system for booking communications';
COMMENT ON TABLE public.message_reactions IS 'Emoji reactions to messages';
COMMENT ON TABLE public.message_attachments IS 'File attachments for messages';
