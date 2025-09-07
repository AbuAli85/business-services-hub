-- Fix milestone_approvals RLS policies to allow proper access
-- This migration ensures both clients and providers can manage milestone approvals

-- First, drop all existing policies
DROP POLICY IF EXISTS "Clients insert approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Clients read approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Providers read approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Providers insert approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Providers update approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Providers delete approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Allow read by related booking members" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Allow authenticated users to manage approvals" ON public.milestone_approvals;

-- Create comprehensive policies for milestone_approvals
-- Policy 1: Allow users to read approvals for milestones they have access to
CREATE POLICY "Users can read milestone approvals"
ON public.milestone_approvals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.bookings b ON b.id = m.booking_id
    WHERE m.id = milestone_approvals.milestone_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- Policy 2: Allow users to insert approvals for milestones they have access to
CREATE POLICY "Users can insert milestone approvals"
ON public.milestone_approvals
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.bookings b ON b.id = m.booking_id
    WHERE m.id = milestone_approvals.milestone_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- Policy 3: Allow users to update their own approvals
CREATE POLICY "Users can update their own approvals"
ON public.milestone_approvals
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.bookings b ON b.id = m.booking_id
    WHERE m.id = milestone_approvals.milestone_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
  )
)
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.bookings b ON b.id = m.booking_id
    WHERE m.id = milestone_approvals.milestone_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- Policy 4: Allow users to delete their own approvals
CREATE POLICY "Users can delete their own approvals"
ON public.milestone_approvals
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.milestones m
    JOIN public.bookings b ON b.id = m.booking_id
    WHERE m.id = milestone_approvals.milestone_id
      AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE public.milestone_approvals IS 'Milestone approval tracking with proper RLS policies for client/provider access';
COMMENT ON POLICY "Users can read milestone approvals" ON public.milestone_approvals IS 'Allows users to read approvals for milestones in their bookings';
COMMENT ON POLICY "Users can insert milestone approvals" ON public.milestone_approvals IS 'Allows users to create approvals for milestones in their bookings';
COMMENT ON POLICY "Users can update their own approvals" ON public.milestone_approvals IS 'Allows users to update their own approvals';
COMMENT ON POLICY "Users can delete their own approvals" ON public.milestone_approvals IS 'Allows users to delete their own approvals';
