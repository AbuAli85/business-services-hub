-- Create milestone_approvals table
CREATE TABLE IF NOT EXISTS public.milestone_approvals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
    approved_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
    feedback TEXT,
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create milestone_comments table
CREATE TABLE IF NOT EXISTS public.milestone_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    comment_type TEXT NOT NULL DEFAULT 'general' CHECK (comment_type IN ('general', 'feedback', 'question', 'issue')),
    parent_id UUID REFERENCES public.milestone_comments(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_milestone_id ON public.milestone_approvals(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_approved_by ON public.milestone_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_milestone_approvals_approved_at ON public.milestone_approvals(approved_at);

CREATE INDEX IF NOT EXISTS idx_milestone_comments_milestone_id ON public.milestone_comments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_created_by ON public.milestone_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_parent_id ON public.milestone_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_created_at ON public.milestone_comments(created_at);

-- Enable RLS
ALTER TABLE public.milestone_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for milestone_approvals
DROP POLICY IF EXISTS "Users can view milestone approvals for their bookings" ON public.milestone_approvals;
DROP POLICY IF EXISTS "Users can create milestone approvals for their bookings" ON public.milestone_approvals;

CREATE POLICY "Users can view milestone approvals for their bookings" ON public.milestone_approvals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON b.id = m.booking_id
            WHERE m.id = milestone_approvals.milestone_id
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can create milestone approvals for their bookings" ON public.milestone_approvals
    FOR INSERT WITH CHECK (
        auth.uid() = approved_by AND
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON b.id = m.booking_id
            WHERE m.id = milestone_approvals.milestone_id
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

-- RLS Policies for milestone_comments
DROP POLICY IF EXISTS "Users can view milestone comments for their bookings" ON public.milestone_comments;
DROP POLICY IF EXISTS "Users can create milestone comments for their bookings" ON public.milestone_comments;
DROP POLICY IF EXISTS "Users can update their own milestone comments" ON public.milestone_comments;
DROP POLICY IF EXISTS "Users can delete their own milestone comments" ON public.milestone_comments;

CREATE POLICY "Users can view milestone comments for their bookings" ON public.milestone_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON b.id = m.booking_id
            WHERE m.id = milestone_comments.milestone_id
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can create milestone comments for their bookings" ON public.milestone_comments
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        EXISTS (
            SELECT 1 FROM public.milestones m
            JOIN public.bookings b ON b.id = m.booking_id
            WHERE m.id = milestone_comments.milestone_id
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own milestone comments" ON public.milestone_comments
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own milestone comments" ON public.milestone_comments
    FOR DELETE USING (auth.uid() = created_by);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone_comments TO authenticated;

-- Add comments
COMMENT ON TABLE public.milestone_approvals IS 'Approval records for milestones';
COMMENT ON TABLE public.milestone_comments IS 'Comments and discussions on milestones';

COMMENT ON COLUMN public.milestone_approvals.action IS 'Type of approval action (approve or reject)';
COMMENT ON COLUMN public.milestone_approvals.feedback IS 'Optional feedback provided with the approval';
COMMENT ON COLUMN public.milestone_comments.comment_type IS 'Type of comment (general, feedback, question, issue)';
COMMENT ON COLUMN public.milestone_comments.parent_id IS 'ID of parent comment for replies';
