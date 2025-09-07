-- Create milestone_approvals table with proper RLS policies
-- This migration creates the missing table and sets up proper permissions

-- Create the milestone_approvals table
CREATE TABLE IF NOT EXISTS public.milestone_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_milestone_id ON public.milestone_approvals(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_user_id ON public.milestone_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_status ON public.milestone_approvals(status);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_created_at ON public.milestone_approvals(created_at);

-- Enable RLS
ALTER TABLE public.milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read milestone approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can insert milestone approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can update their own approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can delete their own approvals" ON public.milestone_approvals;

-- Create comprehensive RLS policies

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

-- Add helpful comments
COMMENT ON TABLE public.milestone_approvals IS 'Milestone approval tracking with proper RLS policies for client/provider access';
COMMENT ON POLICY "Users can read milestone approvals" ON public.milestone_approvals IS 'Allows users to read approvals for milestones in their bookings';
COMMENT ON POLICY "Users can insert milestone approvals" ON public.milestone_approvals IS 'Allows users to create approvals for milestones in their bookings';
COMMENT ON POLICY "Users can update their own approvals" ON public.milestone_approvals IS 'Allows users to update their own approvals';
COMMENT ON POLICY "Users can delete their own approvals" ON public.milestone_approvals IS 'Allows users to delete their own approvals';
