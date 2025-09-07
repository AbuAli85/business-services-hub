-- Create milestone_approvals table with proper structure and indexes
-- This resolves the 403 Forbidden error for milestone approvals

-- Create the table
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
    status = ANY (ARRAY['approved'::text, 'rejected'::text])
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

-- Create RLS policies for proper access control
-- Users can read their own approvals
CREATE POLICY "Users can read their own approvals" ON public.milestone_approvals
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own approvals
CREATE POLICY "Users can insert their own approvals" ON public.milestone_approvals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own approvals
CREATE POLICY "Users can update their own approvals" ON public.milestone_approvals
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own approvals
CREATE POLICY "Users can delete their own approvals" ON public.milestone_approvals
  FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.milestone_approvals TO authenticated;
GRANT ALL ON public.milestone_approvals TO service_role;
