-- Migration: Create Service Suggestions Table
-- Date: December 2024
-- Description: Allow providers to suggest additional services to clients

-- Create service_suggestions table
CREATE TABLE IF NOT EXISTS public.service_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    suggested_service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    original_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    suggestion_reason TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_suggestions_provider_id ON public.service_suggestions(provider_id);
CREATE INDEX IF NOT EXISTS idx_service_suggestions_client_id ON public.service_suggestions(client_id);
CREATE INDEX IF NOT EXISTS idx_service_suggestions_status ON public.service_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_service_suggestions_booking_id ON public.service_suggestions(original_booking_id);
CREATE INDEX IF NOT EXISTS idx_service_suggestions_created_at ON public.service_suggestions(created_at);

-- Enable Row Level Security
ALTER TABLE public.service_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Providers can view their own suggestions
CREATE POLICY "Providers can view their own suggestions" ON public.service_suggestions
    FOR SELECT USING (auth.uid() = provider_id);

-- Providers can create suggestions for their clients
CREATE POLICY "Providers can create suggestions" ON public.service_suggestions
    FOR INSERT WITH CHECK (auth.uid() = provider_id);

-- Providers can update their own suggestions
CREATE POLICY "Providers can update their own suggestions" ON public.service_suggestions
    FOR UPDATE USING (auth.uid() = provider_id);

-- Clients can view suggestions made to them
CREATE POLICY "Clients can view their suggestions" ON public.service_suggestions
    FOR SELECT USING (auth.uid() = client_id);

-- Clients can update suggestions (to mark as viewed, accepted, declined)
CREATE POLICY "Clients can update their suggestions" ON public.service_suggestions
    FOR UPDATE USING (auth.uid() = client_id);

-- Admins can view all suggestions
CREATE POLICY "Admins can view all suggestions" ON public.service_suggestions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_service_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_service_suggestions_updated_at
    BEFORE UPDATE ON public.service_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_service_suggestions_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.service_suggestions TO authenticated;
GRANT SELECT ON public.service_suggestions TO anon;

-- Add comments for documentation
COMMENT ON TABLE public.service_suggestions IS 'Service suggestions made by providers to clients';
COMMENT ON COLUMN public.service_suggestions.provider_id IS 'ID of the provider making the suggestion';
COMMENT ON COLUMN public.service_suggestions.client_id IS 'ID of the client receiving the suggestion';
COMMENT ON COLUMN public.service_suggestions.suggested_service_id IS 'ID of the service being suggested';
COMMENT ON COLUMN public.service_suggestions.original_booking_id IS 'ID of the booking that triggered this suggestion (optional)';
COMMENT ON COLUMN public.service_suggestions.suggestion_reason IS 'Reason why this service is being suggested';
COMMENT ON COLUMN public.service_suggestions.priority IS 'Priority level of the suggestion';
COMMENT ON COLUMN public.service_suggestions.status IS 'Current status of the suggestion';
COMMENT ON COLUMN public.service_suggestions.expires_at IS 'When the suggestion expires (optional)';
