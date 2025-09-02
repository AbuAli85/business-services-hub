-- Create booking_timeline_comments table for task progress tracking
-- This table will store comments and updates related to booking progress

CREATE TABLE IF NOT EXISTS public.booking_timeline_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    reaction TEXT CHECK (reaction IN ('up', 'down')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_timeline_comments_booking_id 
ON public.booking_timeline_comments(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_timeline_comments_user_id 
ON public.booking_timeline_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_booking_timeline_comments_created_at 
ON public.booking_timeline_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.booking_timeline_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view comments for bookings they are involved in
CREATE POLICY "Users can view timeline comments for their bookings" 
ON public.booking_timeline_comments FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_timeline_comments.booking_id 
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
);

-- Users can create comments for bookings they are involved in
CREATE POLICY "Users can create timeline comments for their bookings" 
ON public.booking_timeline_comments FOR INSERT 
WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_timeline_comments.booking_id 
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
);

-- Users can update their own comments
CREATE POLICY "Users can update their own timeline comments" 
ON public.booking_timeline_comments FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own timeline comments" 
ON public.booking_timeline_comments FOR DELETE 
USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_timeline_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_timeline_comments_updated_at
    BEFORE UPDATE ON public.booking_timeline_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_timeline_comments_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.booking_timeline_comments TO authenticated;
GRANT SELECT ON public.booking_timeline_comments TO anon;

-- Add helpful comment
COMMENT ON TABLE public.booking_timeline_comments IS 'Timeline comments and reactions for booking progress tracking';
