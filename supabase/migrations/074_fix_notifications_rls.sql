-- Migration: Fix Notifications RLS Policies
-- Description: Create simple, non-recursive RLS policies for notifications table
-- Date: 2024-12-20

-- Drop all existing policies on notifications table
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.notifications;

-- Create simple policies

-- Policy 1: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Users can update their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy 3: Users can insert notifications for themselves
CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 4: Service role can manage all notifications
CREATE POLICY "Service role can manage notifications" ON public.notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Notifications RLS policies fixed successfully!';
END $$;
