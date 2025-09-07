-- Quick fix for milestone_approvals permission denied error
-- This creates a more permissive RLS policy

-- First, let's temporarily disable RLS to allow access
ALTER TABLE public.milestone_approvals DISABLE ROW LEVEL SECURITY;

-- Then create a simple, permissive policy
ALTER TABLE public.milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows authenticated users to insert approvals
-- for milestones they have access to (either as client or provider)
CREATE POLICY "Allow authenticated users to manage approvals"
ON public.milestone_approvals
FOR ALL
TO authenticated
USING (
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
