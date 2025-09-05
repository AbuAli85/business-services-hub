-- Migration: Create booking_progress table for monthly progress tracking
-- Date: January 2025
-- Description: Add booking_progress table for tracking weekly milestones and progress

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS public.booking_progress CASCADE;

-- Create booking_progress table
CREATE TABLE public.booking_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    milestone_name TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { name, status, tag } objects
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_booking_progress_booking_id ON public.booking_progress(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_progress_week_number ON public.booking_progress(week_number);
CREATE INDEX IF NOT EXISTS idx_booking_progress_progress ON public.booking_progress(progress);

-- Add comments for documentation
COMMENT ON TABLE public.booking_progress IS 'Tracks weekly progress milestones for service bookings';
COMMENT ON COLUMN public.booking_progress.booking_id IS 'Reference to the booking this progress belongs to';
COMMENT ON COLUMN public.booking_progress.milestone_name IS 'Name of the milestone (e.g., "Week 1: Planning")';
COMMENT ON COLUMN public.booking_progress.steps IS 'JSONB array of step objects with name, status, and tag properties';
COMMENT ON COLUMN public.booking_progress.progress IS 'Progress percentage for this milestone (0-100)';
COMMENT ON COLUMN public.booking_progress.week_number IS 'Week number within the booking period (1-52)';

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_booking_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_booking_progress_updated_at ON public.booking_progress;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_booking_progress_updated_at
    BEFORE UPDATE ON public.booking_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_progress_updated_at();

-- Drop existing function if it exists with different parameter name
DROP FUNCTION IF EXISTS calculate_booking_progress(uuid);
DROP FUNCTION IF EXISTS calculate_booking_progress(UUID);

-- Create function to calculate overall booking progress
CREATE OR REPLACE FUNCTION calculate_booking_progress(booking_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    total_progress INTEGER;
    milestone_count INTEGER;
BEGIN
    -- Get the average progress across all milestones for this booking
    SELECT 
        COALESCE(AVG(progress), 0)::INTEGER,
        COUNT(*)
    INTO total_progress, milestone_count
    FROM public.booking_progress
    WHERE booking_id = booking_uuid;
    
    -- Return 0 if no milestones exist
    IF milestone_count = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN total_progress;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_default_milestones(uuid);
DROP FUNCTION IF EXISTS create_default_milestones(UUID);

-- Create function to auto-generate default milestones for a booking
CREATE OR REPLACE FUNCTION create_default_milestones(booking_uuid UUID)
RETURNS VOID AS $$
DECLARE
    service_title TEXT;
    week_names TEXT[] := ARRAY[
        'Week 1: Planning',
        'Week 2: Content Creation', 
        'Week 3: Posting',
        'Week 4: Reporting'
    ];
    week_steps JSONB[] := ARRAY[
        '[{"name": "Brief Review", "status": "pending", "tag": "planning"}, {"name": "Calendar Setup", "status": "pending", "tag": "planning"}, {"name": "Strategy Review", "status": "pending", "tag": "planning"}]'::jsonb,
        '[{"name": "Design Creation", "status": "pending", "tag": "content"}, {"name": "Copywriting", "status": "pending", "tag": "content"}, {"name": "Quality Assurance", "status": "pending", "tag": "content"}]'::jsonb,
        '[{"name": "Scheduling", "status": "pending", "tag": "posting"}, {"name": "Ad Campaigns", "status": "pending", "tag": "posting"}, {"name": "Live Posts", "status": "pending", "tag": "posting"}]'::jsonb,
        '[{"name": "Performance Monitoring", "status": "pending", "tag": "reporting"}, {"name": "Report Generation", "status": "pending", "tag": "reporting"}, {"name": "Client Review", "status": "pending", "tag": "reporting"}]'::jsonb
    ];
    i INTEGER;
BEGIN
    -- Get service title for context
    SELECT s.title INTO service_title
    FROM public.bookings b
    JOIN public.services s ON b.service_id = s.id
    WHERE b.id = booking_uuid;
    
    -- Create 4 default milestones
    FOR i IN 1..4 LOOP
        INSERT INTO public.booking_progress (
            booking_id,
            milestone_name,
            steps,
            progress,
            week_number
        ) VALUES (
            booking_uuid,
            week_names[i],
            week_steps[i],
            0,
            i
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_milestone_progress(uuid);
DROP FUNCTION IF EXISTS update_milestone_progress(UUID);

-- Create function to update milestone progress based on step completion
CREATE OR REPLACE FUNCTION update_milestone_progress(milestone_uuid UUID)
RETURNS VOID AS $$
DECLARE
    step_data JSONB;
    total_steps INTEGER;
    completed_steps INTEGER;
    new_progress INTEGER;
BEGIN
    -- Get the steps data for this milestone
    SELECT steps INTO step_data
    FROM public.booking_progress
    WHERE id = milestone_uuid;
    
    -- Count total and completed steps
    total_steps := jsonb_array_length(step_data);
    completed_steps := (
        SELECT COUNT(*)
        FROM jsonb_array_elements(step_data) AS step
        WHERE (step->>'status') = 'completed'
    );
    
    -- Calculate progress percentage
    IF total_steps > 0 THEN
        new_progress := (completed_steps * 100) / total_steps;
    ELSE
        new_progress := 0;
    END IF;
    
    -- Update the milestone progress
    UPDATE public.booking_progress
    SET progress = new_progress
    WHERE id = milestone_uuid;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_overdue_milestones();

-- Create function to check for overdue milestones
CREATE OR REPLACE FUNCTION check_overdue_milestones()
RETURNS VOID AS $$
DECLARE
    current_week INTEGER;
    milestone_record RECORD;
BEGIN
    -- Get current week number
    current_week := EXTRACT(WEEK FROM NOW());
    
    -- Find milestones that are overdue (week_number < current_week and progress < 100)
    FOR milestone_record IN
        SELECT id, milestone_name, week_number, progress
        FROM public.booking_progress
        WHERE week_number < current_week 
        AND progress < 100
    LOOP
        -- Log overdue milestone (in a real system, you might want to create notifications)
        RAISE NOTICE 'Overdue milestone: % (Week %, Progress: %)', 
            milestone_record.milestone_name, 
            milestone_record.week_number, 
            milestone_record.progress;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_progress TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.booking_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view progress for their bookings" ON public.booking_progress;
DROP POLICY IF EXISTS "Providers can manage progress for their bookings" ON public.booking_progress;

-- Create RLS policies
CREATE POLICY "Users can view progress for their bookings" ON public.booking_progress
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM public.bookings 
            WHERE client_id = auth.uid() OR provider_id = auth.uid()
        )
    );

CREATE POLICY "Providers can manage progress for their bookings" ON public.booking_progress
    FOR ALL USING (
        booking_id IN (
            SELECT id FROM public.bookings 
            WHERE provider_id = auth.uid()
        )
    );

-- Insert sample data for testing (optional)
-- This will create default milestones for existing bookings
DO $$
DECLARE
    booking_record RECORD;
BEGIN
    -- Only create milestones for bookings that don't already have them
    FOR booking_record IN
        SELECT id FROM public.bookings
        WHERE id NOT IN (SELECT DISTINCT booking_id FROM public.booking_progress)
        AND status IN ('confirmed', 'in_progress')
    LOOP
        PERFORM create_default_milestones(booking_record.id);
    END LOOP;
END $$;
