-- ========================================
-- MANUAL SETUP: Booking Files System
-- ========================================
-- Copy and paste this entire script into your Supabase SQL Editor
-- and run it to set up the booking files system

-- 1. Create booking_files table
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

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_files_booking_id ON public.booking_files(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_files_category ON public.booking_files(category);
CREATE INDEX IF NOT EXISTS idx_booking_files_uploaded_by ON public.booking_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_booking_files_created_at ON public.booking_files(created_at);

-- 3. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_booking_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger (drop first if exists)
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

-- 5. Enable Row Level Security
ALTER TABLE public.booking_files ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Drop existing policies if they exist (use CASCADE to handle dependencies)
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

-- Create new policies
CREATE POLICY "Users can view booking files for their bookings" ON public.booking_files
    FOR SELECT USING (
        booking_id IN (
            SELECT b.id FROM public.bookings b
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload booking files for their bookings" ON public.booking_files
    FOR INSERT WITH CHECK (
        booking_id IN (
            SELECT b.id FROM public.bookings b
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

CREATE POLICY "Users can update their own uploaded booking files" ON public.booking_files
    FOR UPDATE USING (
        uploaded_by = auth.uid()
        AND booking_id IN (
            SELECT b.id FROM public.bookings b
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete booking files they uploaded or own" ON public.booking_files
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR booking_id IN (
            SELECT b.id FROM public.bookings b
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        )
    );

-- 7. Create storage bucket for booking files
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-files', 'booking-files', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Create storage policies
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

-- 9. Grant permissions
GRANT ALL ON public.booking_files TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Your booking files system is now ready to use!
-- You can now upload and manage files in your milestone system.
