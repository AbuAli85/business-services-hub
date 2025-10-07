-- Fix milestone_approvals schema conflicts
-- This script consolidates all milestone_approvals table definitions and fixes the 500 error

-- First, drop the table completely to avoid conflicts
DROP TABLE IF EXISTS public.milestone_approvals CASCADE;

-- Create the milestone_approvals table with the correct schema
-- This matches what the API expects: user_id, status, comment, created_at
CREATE TABLE public.milestone_approvals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL,
  comment text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT milestone_approvals_pkey PRIMARY KEY (id),
  CONSTRAINT milestone_approvals_milestone_id_fkey FOREIGN KEY (milestone_id) REFERENCES milestones (id) ON DELETE CASCADE,
  CONSTRAINT milestone_approvals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT milestone_approvals_status_check CHECK (
    status = ANY (ARRAY['approved'::text, 'rejected'::text, 'pending'::text])
  )
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_milestone_id 
  ON public.milestone_approvals USING btree (milestone_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_milestone_approvals_user_id 
  ON public.milestone_approvals USING btree (user_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_milestone_approvals_status 
  ON public.milestone_approvals USING btree (status) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_milestone_approvals_created_at 
  ON public.milestone_approvals USING btree (created_at) 
  TABLESPACE pg_default;

-- Enable Row Level Security (RLS)
ALTER TABLE public.milestone_approvals ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can read their own approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can insert their own approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can update their own approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can delete their own approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can read milestone approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can insert milestone approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can update milestone approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can delete milestone approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Clients can read approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Providers can read approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Clients can insert approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Providers can insert approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Clients can update their approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Providers can update their approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Clients can delete their approvals" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Providers can delete their approvals" ON public.milestone_approvals;

-- Create comprehensive RLS policies for milestone_approvals
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

-- Grant necessary permissions
GRANT ALL ON public.milestone_approvals TO authenticated;
GRANT ALL ON public.milestone_approvals TO service_role;

-- Add helpful comments
COMMENT ON TABLE public.milestone_approvals IS 'Milestone approval tracking with proper RLS policies for client/provider access';
COMMENT ON POLICY "Users can read milestone approvals" ON public.milestone_approvals IS 'Allows users to read approvals for milestones in their bookings';
COMMENT ON POLICY "Users can insert milestone approvals" ON public.milestone_approvals IS 'Allows users to create approvals for milestones in their bookings';
COMMENT ON POLICY "Users can update their own approvals" ON public.milestone_approvals IS 'Allows users to update their own approvals';
COMMENT ON POLICY "Users can delete their own approvals" ON public.milestone_approvals IS 'Allows users to delete their own approvals';
