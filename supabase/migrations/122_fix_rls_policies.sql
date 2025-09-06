-- Migration: Fix RLS Policies for Action Requests and Comments
-- Date: December 2024
-- Description: Fix RLS policies to allow proper access for authenticated users

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view action requests for their bookings" ON public.action_requests;
DROP POLICY IF EXISTS "Users can create action requests for their bookings" ON public.action_requests;
DROP POLICY IF EXISTS "Users can update action requests they created or are assigned to" ON public.action_requests;

DROP POLICY IF EXISTS "Users can view comments for their milestones" ON public.milestone_comments;
DROP POLICY IF EXISTS "Users can create comments for their milestones" ON public.milestone_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.milestone_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.milestone_comments;

-- Create improved RLS policies for action_requests
CREATE POLICY "Enable read access for authenticated users" ON public.action_requests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.action_requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.action_requests
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.action_requests
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create improved RLS policies for milestone_comments
CREATE POLICY "Enable read access for authenticated users" ON public.milestone_comments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.milestone_comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.milestone_comments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.milestone_comments
    FOR DELETE USING (auth.role() = 'authenticated');

-- Grant additional permissions
GRANT ALL ON public.action_requests TO authenticated;
GRANT ALL ON public.milestone_comments TO authenticated;

-- Ensure service role can bypass RLS
GRANT ALL ON public.action_requests TO service_role;
GRANT ALL ON public.milestone_comments TO service_role;
