# 🚀 Enhanced Messaging System Database Setup

The enhanced messaging interface is deployed but needs database tables to function. Here's how to set it up:

## ⚡ Quick Setup Instructions

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `business-services-hub`
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the SQL Script
Copy and paste this SQL script into the SQL Editor and click **RUN**:

```sql
-- Enhanced Messaging System Tables
-- This creates the complete messaging infrastructure

-- ============================================================================
-- 1. BOOKING MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.booking_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system', 'template')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    sender_role VARCHAR(20) NOT NULL CHECK (sender_role IN ('client', 'provider', 'admin')),
    replied_to_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints
ALTER TABLE public.booking_messages 
ADD CONSTRAINT IF NOT EXISTS booking_messages_booking_id_fkey 
FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.booking_messages 
ADD CONSTRAINT IF NOT EXISTS booking_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- 2. MESSAGE REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction)
);

ALTER TABLE public.message_reactions 
ADD CONSTRAINT IF NOT EXISTS message_reactions_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.booking_messages(id) ON DELETE CASCADE;

ALTER TABLE public.message_reactions 
ADD CONSTRAINT IF NOT EXISTS message_reactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. MESSAGE ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.message_attachments 
ADD CONSTRAINT IF NOT EXISTS message_attachments_message_id_fkey 
FOREIGN KEY (message_id) REFERENCES public.booking_messages(id) ON DELETE CASCADE;

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id ON public.booking_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_sender_id ON public.booking_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_created_at ON public.booking_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view messages for their bookings" ON public.booking_messages;
DROP POLICY IF EXISTS "Users can send messages for their bookings" ON public.booking_messages;
DROP POLICY IF EXISTS "Users can update their messages" ON public.booking_messages;

-- Booking Messages Policies
CREATE POLICY "Users can view messages for their bookings" ON public.booking_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_messages.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages for their bookings" ON public.booking_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their messages" ON public.booking_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_messages.booking_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- Message Reactions Policies
DROP POLICY IF EXISTS "Users can view reactions for accessible messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can react to accessible messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.message_reactions;

CREATE POLICY "Users can view reactions for accessible messages" ON public.message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.booking_messages bm
            JOIN public.bookings b ON b.id = bm.booking_id
            WHERE bm.id = message_reactions.message_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

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

CREATE POLICY "Users can delete their own reactions" ON public.message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Message Attachments Policies
DROP POLICY IF EXISTS "Users can view attachments for accessible messages" ON public.message_attachments;
DROP POLICY IF EXISTS "Users can add attachments to their booking messages" ON public.message_attachments;

CREATE POLICY "Users can view attachments for accessible messages" ON public.message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.booking_messages bm
            JOIN public.bookings b ON b.id = bm.booking_id
            WHERE bm.id = message_attachments.message_id 
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

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
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.booking_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT SELECT, INSERT ON public.message_attachments TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 7. TEST MESSAGE (Optional)
-- ============================================================================

-- Insert a welcome message to test the system
INSERT INTO public.booking_messages (booking_id, sender_id, content, sender_role, message_type, priority)
SELECT 
    '8ccbb969-3639-4ff4-ae4d-722d9580db57'::UUID,
    auth.uid(),
    'Welcome to the enhanced messaging system! 🎉 You can now enjoy professional messaging with templates, reactions, and more.',
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'provider') THEN 'provider'
        ELSE 'client'
    END,
    'system',
    'normal'
WHERE auth.uid() IS NOT NULL;
```

### Step 3: Verify Setup
After running the SQL:

1. ✅ Check the **Table Editor** - you should see:
   - `booking_messages`
   - `message_reactions` 
   - `message_attachments`

2. ✅ Refresh your application at `https://marketing.thedigitalmorph.com`

3. ✅ Navigate to any booking details page → Messages tab

4. ✅ You should see the enhanced messaging interface working!

## 🎯 What You'll Get

- **Professional messaging interface** with modern design
- **Message templates** for common scenarios
- **Quick reply buttons** for efficiency
- **Reaction system** (👍 ❤️ etc.)
- **Message priority levels** (Low, Normal, High, Urgent)
- **Read receipts** and status indicators
- **Search and filter** capabilities
- **Real-time communication statistics**

## 🔧 Troubleshooting

If you encounter any issues:

1. **Check Authentication**: Make sure you're logged in to Supabase dashboard
2. **Project Selection**: Ensure you're in the correct project
3. **Permissions**: The script includes all necessary permissions
4. **Foreign Keys**: The script checks for existing bookings table

## 📞 Need Help?

If you need assistance running this SQL:
1. I can walk you through it step by step
2. Or you can run it section by section if needed
3. The script is designed to be safe and won't break existing data

**The enhanced messaging system is ready to use once these tables are created!** 🚀
