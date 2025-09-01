-- Fix foreign key relationships between bookings and profiles tables
-- This migration ensures Supabase properly recognizes the relationships for enhanced booking details

-- First, let's verify and recreate the foreign key constraints for bookings table
-- This will ensure Supabase's schema cache recognizes the relationships

-- Drop existing foreign key constraints if they exist
ALTER TABLE IF EXISTS public.bookings 
DROP CONSTRAINT IF EXISTS bookings_client_id_fkey;

ALTER TABLE IF EXISTS public.bookings 
DROP CONSTRAINT IF EXISTS bookings_provider_id_fkey;

ALTER TABLE IF EXISTS public.bookings 
DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;

-- Re-add the foreign key constraints explicitly
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

-- Ensure the bookings table has all necessary columns for enhanced booking details
DO $$
BEGIN
    -- Add enhanced booking fields if they don't exist
    
    -- Progress tracking
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'progress_percentage') THEN
        ALTER TABLE public.bookings ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
        RAISE NOTICE 'Added progress_percentage column';
    END IF;
    
    -- Priority level
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'priority') THEN
        ALTER TABLE public.bookings ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
        RAISE NOTICE 'Added priority column';
    END IF;
    
    -- Estimated completion date
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'estimated_completion') THEN
        ALTER TABLE public.bookings ADD COLUMN estimated_completion TIMESTAMPTZ;
        RAISE NOTICE 'Added estimated_completion column';
    END IF;
    
    -- Actual completion date
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'actual_completion') THEN
        ALTER TABLE public.bookings ADD COLUMN actual_completion TIMESTAMPTZ;
        RAISE NOTICE 'Added actual_completion column';
    END IF;
    
    -- Location information
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'location') THEN
        ALTER TABLE public.bookings ADD COLUMN location TEXT;
        RAISE NOTICE 'Added location column';
    END IF;
    
    -- Location type
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'location_type') THEN
        ALTER TABLE public.bookings ADD COLUMN location_type TEXT DEFAULT 'on_site' CHECK (location_type IN ('on_site', 'remote', 'hybrid'));
        RAISE NOTICE 'Added location_type column';
    END IF;
    
    -- Client rating
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'client_rating') THEN
        ALTER TABLE public.bookings ADD COLUMN client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5);
        RAISE NOTICE 'Added client_rating column';
    END IF;
    
    -- Provider rating
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'provider_rating') THEN
        ALTER TABLE public.bookings ADD COLUMN provider_rating INTEGER CHECK (provider_rating >= 1 AND provider_rating <= 5);
        RAISE NOTICE 'Added provider_rating column';
    END IF;
    
    -- Client satisfaction score
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'client_satisfaction') THEN
        ALTER TABLE public.bookings ADD COLUMN client_satisfaction NUMERIC(3,2) CHECK (client_satisfaction >= 0 AND client_satisfaction <= 5);
        RAISE NOTICE 'Added client_satisfaction column';
    END IF;
    
    -- Estimated duration
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'estimated_duration') THEN
        ALTER TABLE public.bookings ADD COLUMN estimated_duration TEXT DEFAULT '2 hours';
        RAISE NOTICE 'Added estimated_duration column';
    END IF;
    
    -- Actual duration
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'actual_duration') THEN
        ALTER TABLE public.bookings ADD COLUMN actual_duration TEXT;
        RAISE NOTICE 'Added actual_duration column';
    END IF;
    
    -- Notes field
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'notes') THEN
        ALTER TABLE public.bookings ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column';
    END IF;
    
    -- Tags for categorization
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'tags') THEN
        ALTER TABLE public.bookings ADD COLUMN tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added tags column';
    END IF;
    
    -- Attachments
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'attachments') THEN
        ALTER TABLE public.bookings ADD COLUMN attachments JSONB DEFAULT '[]';
        RAISE NOTICE 'Added attachments column';
    END IF;
    
    -- Milestones
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'milestones') THEN
        ALTER TABLE public.bookings ADD COLUMN milestones JSONB DEFAULT '[]';
        RAISE NOTICE 'Added milestones column';
    END IF;
    
    -- Issues tracking
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'issues') THEN
        ALTER TABLE public.bookings ADD COLUMN issues JSONB DEFAULT '[]';
        RAISE NOTICE 'Added issues column';
    END IF;
    
    -- Payment status for enhanced payment tracking
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'overdue'));
        RAISE NOTICE 'Added payment_status column';
    END IF;
    
    -- Payment method
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_method') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_method TEXT;
        RAISE NOTICE 'Added payment_method column';
    END IF;
    
    RAISE NOTICE 'Enhanced booking fields added successfully';
END $$;

-- Add enhanced fields to profiles table for better client-provider information
DO $$
BEGIN
    -- Provider availability status
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'availability_status') THEN
        ALTER TABLE public.profiles ADD COLUMN availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'away', 'offline'));
        RAISE NOTICE 'Added availability_status column to profiles';
    END IF;
    
    -- Response time
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'response_time') THEN
        ALTER TABLE public.profiles ADD COLUMN response_time TEXT DEFAULT '< 1 hour';
        RAISE NOTICE 'Added response_time column to profiles';
    END IF;
    
    -- Timezone
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'timezone') THEN
        ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'Asia/Muscat';
        RAISE NOTICE 'Added timezone column to profiles';
    END IF;
    
    -- Preferred contact method
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferred_contact_method') THEN
        ALTER TABLE public.profiles ADD COLUMN preferred_contact_method TEXT DEFAULT 'message' CHECK (preferred_contact_method IN ('email', 'phone', 'message', 'video'));
        RAISE NOTICE 'Added preferred_contact_method column to profiles';
    END IF;
    
    -- Overall rating
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'rating') THEN
        ALTER TABLE public.profiles ADD COLUMN rating NUMERIC(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5);
        RAISE NOTICE 'Added rating column to profiles';
    END IF;
    
    -- Total reviews count
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'total_reviews') THEN
        ALTER TABLE public.profiles ADD COLUMN total_reviews INTEGER DEFAULT 0;
        RAISE NOTICE 'Added total_reviews column to profiles';
    END IF;
    
    -- Specialization for providers
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'specialization') THEN
        ALTER TABLE public.profiles ADD COLUMN specialization TEXT[];
        RAISE NOTICE 'Added specialization column to profiles';
    END IF;
    
    RAISE NOTICE 'Enhanced profile fields added successfully';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_progress_percentage ON public.bookings(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_bookings_priority ON public.bookings(priority);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_estimated_completion ON public.bookings(estimated_completion);
CREATE INDEX IF NOT EXISTS idx_profiles_availability_status ON public.profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating);

-- Update RLS policies to ensure enhanced booking details work properly
DROP POLICY IF EXISTS "Enhanced booking details access" ON public.bookings;
CREATE POLICY "Enhanced booking details access" ON public.bookings
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant necessary permissions for enhanced features
GRANT ALL ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Force schema cache refresh by updating table comments
COMMENT ON TABLE public.bookings IS 'Enhanced bookings table with foreign key relationships - Updated: 2024-12-20';
COMMENT ON TABLE public.profiles IS 'Enhanced profiles table with availability tracking - Updated: 2024-12-20';

-- Refresh schema cache (PostgREST specific)
NOTIFY pgrst, 'reload schema';

-- Final status message
DO $$
BEGIN
    RAISE NOTICE 'Foreign key relationships fixed and enhanced booking details schema updated successfully';
END $$;
