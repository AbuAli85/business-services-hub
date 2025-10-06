-- Create booking_files table for project file management
CREATE TABLE IF NOT EXISTS public.booking_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('documents', 'images', 'contracts', 'deliverables', 'other')),
    description TEXT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_booking_files_booking_id ON public.booking_files(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_files_category ON public.booking_files(category);
CREATE INDEX IF NOT EXISTS idx_booking_files_uploaded_by ON public.booking_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_booking_files_created_at ON public.booking_files(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_booking_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_booking_files_updated_at') THEN
        DROP TRIGGER trigger_update_booking_files_updated_at ON public.booking_files;
    END IF;
END $$;

CREATE TRIGGER trigger_update_booking_files_updated_at
    BEFORE UPDATE ON public.booking_files
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_files_updated_at();

-- Add RLS policies
ALTER TABLE public.booking_files ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (use error handling)
DO $$
BEGIN
    -- Drop policies one by one with error handling
    BEGIN
        DROP POLICY IF EXISTS "Users can view booking files for their bookings" ON public.booking_files;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore errors if policy doesn't exist
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can upload booking files for their bookings" ON public.booking_files;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can update their own uploaded booking files" ON public.booking_files;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can delete booking files they uploaded or own" ON public.booking_files;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- Policy for reading booking files - users can see files for bookings they're involved in
CREATE POLICY "Users can view booking files for their bookings" ON public.booking_files
    FOR SELECT USING (
        booking_id IN (
            SELECT b.id FROM public.bookings b
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
    );

-- Policy for inserting booking files - only booking participants can upload
CREATE POLICY "Users can upload booking files for their bookings" ON public.booking_files
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT b.id FROM public.bookings b
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

-- Policy for updating booking files - only the uploader can update
CREATE POLICY "Users can update their own uploaded booking files" ON public.booking_files
    FOR UPDATE USING (
        uploaded_by = auth.uid()
        AND booking_id IN (
            SELECT b.id FROM public.bookings b
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
    );

-- Policy for deleting booking files - only the uploader or booking owner can delete
CREATE POLICY "Users can delete booking files they uploaded or own" ON public.booking_files
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR booking_id IN (
            SELECT b.id FROM public.bookings b
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
    );

-- Create storage bucket for booking files
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-files', 'booking-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for booking files
DO $$
BEGIN
    -- Drop storage policies with error handling
    BEGIN
        DROP POLICY IF EXISTS "Users can upload booking files" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can view booking files" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can delete their own booking files" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

CREATE POLICY "Users can upload booking files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'booking-files'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can view booking files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'booking-files'
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can delete their own booking files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'booking-files'
        AND auth.uid() IS NOT NULL
    );

-- Grant permissions
GRANT ALL ON public.booking_files TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
