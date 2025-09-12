-- Migration: Create Action Requests Table
-- Date: December 2024
-- Description: Create table for client action requests and provider responses

-- Create action_requests table
CREATE TABLE IF NOT EXISTS public.action_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('change_request', 'question', 'approval_needed', 'issue_report')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    response TEXT,
    response_author UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    response_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_action_requests_booking_id ON public.action_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_action_requests_milestone_id ON public.action_requests(milestone_id);
CREATE INDEX IF NOT EXISTS idx_action_requests_requested_by ON public.action_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_action_requests_status ON public.action_requests(status);
CREATE INDEX IF NOT EXISTS idx_action_requests_priority ON public.action_requests(priority);

-- Enable RLS
ALTER TABLE public.action_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view action requests for their bookings" ON public.action_requests
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM public.bookings 
            WHERE client_id = auth.uid() OR provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can create action requests for their bookings" ON public.action_requests
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT id FROM public.bookings 
            WHERE client_id = auth.uid() OR provider_id = auth.uid()
        ) AND requested_by = auth.uid()
    );

CREATE POLICY "Users can update action requests they created or are assigned to" ON public.action_requests
    FOR UPDATE USING (
        requested_by = auth.uid() OR 
        assigned_to = auth.uid() OR
        booking_id IN (
            SELECT id FROM public.bookings 
            WHERE provider_id = auth.uid()
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_action_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_action_requests_updated_at
    BEFORE UPDATE ON public.action_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_action_requests_updated_at();

-- Grant permissions
GRANT ALL ON public.action_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
