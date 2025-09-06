-- Migration: Create Milestone Comments Table
-- Date: December 2024
-- Description: Create table for milestone comments and client feedback

-- Create milestone_comments table
CREATE TABLE IF NOT EXISTS public.milestone_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_milestone_comments_milestone_id ON public.milestone_comments(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_author_id ON public.milestone_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_milestone_comments_created_at ON public.milestone_comments(created_at);

-- Enable RLS
ALTER TABLE public.milestone_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view comments for their milestones" ON public.milestone_comments
    FOR SELECT USING (
        milestone_id IN (
            SELECT m.id FROM public.milestones m
            JOIN public.bookings b ON m.booking_id = b.id
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can create comments for their milestones" ON public.milestone_comments
    FOR INSERT WITH CHECK (
        author_id = auth.uid() AND
        milestone_id IN (
            SELECT m.id FROM public.milestones m
            JOIN public.bookings b ON m.booking_id = b.id
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own comments" ON public.milestone_comments
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.milestone_comments
    FOR DELETE USING (author_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_milestone_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_milestone_comments_updated_at
    BEFORE UPDATE ON public.milestone_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_milestone_comments_updated_at();

-- Grant permissions
GRANT ALL ON public.milestone_comments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
