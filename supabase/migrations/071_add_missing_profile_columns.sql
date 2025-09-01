-- Migration: Add Missing Profile Columns for Enhanced Booking Details
-- Description: Add phone, company_name, avatar_url, and other missing columns to profiles table
-- Date: 2024-12-20

-- Add phone column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column to profiles table';
    ELSE
        RAISE NOTICE 'phone column already exists in profiles table';
    END IF;
END $$;

-- Add company_name column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'company_name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN company_name TEXT;
        RAISE NOTICE 'Added company_name column to profiles table';
    ELSE
        RAISE NOTICE 'company_name column already exists in profiles table';
    END IF;
END $$;

-- Add avatar_url column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to profiles table';
    ELSE
        RAISE NOTICE 'avatar_url column already exists in profiles table';
    END IF;
END $$;

-- Add timezone column to profiles table (if not already added by previous migration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'timezone'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'Asia/Muscat';
        RAISE NOTICE 'Added timezone column to profiles table';
    ELSE
        RAISE NOTICE 'timezone column already exists in profiles table';
    END IF;
END $$;

-- Add preferred_contact_method column to profiles table (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'preferred_contact_method'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN preferred_contact_method TEXT DEFAULT 'message' CHECK (preferred_contact_method IN ('email', 'phone', 'message', 'video'));
        RAISE NOTICE 'Added preferred_contact_method column to profiles table';
    ELSE
        RAISE NOTICE 'preferred_contact_method column already exists in profiles table';
    END IF;
END $$;

-- Add specialization column to profiles table (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'specialization'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN specialization TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added specialization column to profiles table';
    ELSE
        RAISE NOTICE 'specialization column already exists in profiles table';
    END IF;
END $$;

-- Add rating column to profiles table (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'rating'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN rating NUMERIC(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5);
        RAISE NOTICE 'Added rating column to profiles table';
    ELSE
        RAISE NOTICE 'rating column already exists in profiles table';
    END IF;
END $$;

-- Add response_time column to profiles table (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'response_time'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN response_time TEXT DEFAULT '< 1 hour';
        RAISE NOTICE 'Added response_time column to profiles table';
    ELSE
        RAISE NOTICE 'response_time column already exists in profiles table';
    END IF;
END $$;

-- Add availability_status column to profiles table (if not already added)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'availability_status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'away', 'offline'));
        RAISE NOTICE 'Added availability_status column to profiles table';
    ELSE
        RAISE NOTICE 'availability_status column already exists in profiles table';
    END IF;
END $$;

-- Add professional_title column for better profile presentation
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'professional_title'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN professional_title TEXT;
        RAISE NOTICE 'Added professional_title column to profiles table';
    ELSE
        RAISE NOTICE 'professional_title column already exists in profiles table';
    END IF;
END $$;

-- Add bio column for detailed profile descriptions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Added bio column to profiles table';
    ELSE
        RAISE NOTICE 'bio column already exists in profiles table';
    END IF;
END $$;

-- Add experience_years column for provider expertise
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'experience_years'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN experience_years INTEGER DEFAULT 0;
        RAISE NOTICE 'Added experience_years column to profiles table';
    ELSE
        RAISE NOTICE 'experience_years column already exists in profiles table';
    END IF;
END $$;

-- Add certifications column for professional credentials
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'certifications'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN certifications TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added certifications column to profiles table';
    ELSE
        RAISE NOTICE 'certifications column already exists in profiles table';
    END IF;
END $$;

-- Add languages column for communication preferences
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'languages'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN languages TEXT[] DEFAULT '{"English", "Arabic"}';
        RAISE NOTICE 'Added languages column to profiles table';
    ELSE
        RAISE NOTICE 'languages column already exists in profiles table';
    END IF;
END $$;

-- Add hourly_rate column for pricing information
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'hourly_rate'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN hourly_rate NUMERIC(10,3) DEFAULT 0;
        RAISE NOTICE 'Added hourly_rate column to profiles table';
    ELSE
        RAISE NOTICE 'hourly_rate column already exists in profiles table';
    END IF;
END $$;

-- Add location column for geographical information
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'location'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN location TEXT;
        RAISE NOTICE 'Added location column to profiles table';
    ELSE
        RAISE NOTICE 'location column already exists in profiles table';
    END IF;
END $$;

-- Add website_url column for professional websites
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'website_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN website_url TEXT;
        RAISE NOTICE 'Added website_url column to profiles table';
    ELSE
        RAISE NOTICE 'website_url column already exists in profiles table';
    END IF;
END $$;

-- Add social_links column for social media profiles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'social_links'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN social_links JSONB DEFAULT '{}';
        RAISE NOTICE 'Added social_links column to profiles table';
    ELSE
        RAISE NOTICE 'social_links column already exists in profiles table';
    END IF;
END $$;

-- Add last_active column for activity tracking
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'last_active'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_active TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added last_active column to profiles table';
    ELSE
        RAISE NOTICE 'last_active column already exists in profiles table';
    END IF;
END $$;

-- Update existing profiles with default values for new columns
UPDATE public.profiles 
SET 
    timezone = COALESCE(timezone, 'Asia/Muscat'),
    preferred_contact_method = COALESCE(preferred_contact_method, 'message'),
    rating = COALESCE(rating, 5.0),
    response_time = COALESCE(response_time, '< 1 hour'),
    availability_status = COALESCE(availability_status, 'available'),
    experience_years = COALESCE(experience_years, 0),
    hourly_rate = COALESCE(hourly_rate, 0),
    last_active = COALESCE(last_active, NOW())
WHERE 
    timezone IS NULL 
    OR preferred_contact_method IS NULL 
    OR rating IS NULL 
    OR response_time IS NULL 
    OR availability_status IS NULL 
    OR experience_years IS NULL 
    OR hourly_rate IS NULL 
    OR last_active IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON public.profiles(timezone);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_contact_method ON public.profiles(preferred_contact_method);
CREATE INDEX IF NOT EXISTS idx_profiles_specialization ON public.profiles USING GIN(specialization);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating);
CREATE INDEX IF NOT EXISTS idx_profiles_availability_status ON public.profiles(availability_status);
CREATE INDEX IF NOT EXISTS idx_profiles_professional_title ON public.profiles(professional_title);
CREATE INDEX IF NOT EXISTS idx_profiles_experience_years ON public.profiles(experience_years);
CREATE INDEX IF NOT EXISTS idx_profiles_certifications ON public.profiles USING GIN(certifications);
CREATE INDEX IF NOT EXISTS idx_profiles_languages ON public.profiles USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_profiles_hourly_rate ON public.profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(location);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active);
CREATE INDEX IF NOT EXISTS idx_profiles_social_links ON public.profiles USING GIN(social_links);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Enhanced profiles access for booking details" ON public.profiles;
CREATE POLICY "Enhanced profiles access for booking details" ON public.profiles
    FOR SELECT USING (
        -- Users can view their own profile completely
        auth.uid() = id OR
        -- Users can view basic info of profiles they interact with through bookings
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE (client_id = auth.uid() AND provider_id = profiles.id) 
               OR (provider_id = auth.uid() AND client_id = profiles.id)
        ) OR
        -- Admins can view all profiles
        EXISTS (
            SELECT 1 FROM profiles admin_profile
            WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
        ) OR
        -- Public view for approved providers (limited fields)
        (role = 'provider' AND is_verified = true)
    );

-- Grant permissions for new columns
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;

-- Add helpful comments for new columns
COMMENT ON COLUMN public.profiles.phone IS 'Contact phone number for the user';
COMMENT ON COLUMN public.profiles.company_name IS 'Company or business name associated with the profile';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to the user profile picture/avatar';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone for scheduling and communication';
COMMENT ON COLUMN public.profiles.preferred_contact_method IS 'Preferred method of communication';
COMMENT ON COLUMN public.profiles.specialization IS 'Array of specialization areas for providers';
COMMENT ON COLUMN public.profiles.rating IS 'Overall rating based on reviews and feedback';
COMMENT ON COLUMN public.profiles.response_time IS 'Typical response time for communications';
COMMENT ON COLUMN public.profiles.availability_status IS 'Current availability status';
COMMENT ON COLUMN public.profiles.professional_title IS 'Professional title or job role';
COMMENT ON COLUMN public.profiles.bio IS 'Detailed biography or description';
COMMENT ON COLUMN public.profiles.experience_years IS 'Years of professional experience';
COMMENT ON COLUMN public.profiles.certifications IS 'Array of professional certifications';
COMMENT ON COLUMN public.profiles.languages IS 'Array of spoken languages';
COMMENT ON COLUMN public.profiles.hourly_rate IS 'Hourly rate for services (in OMR)';
COMMENT ON COLUMN public.profiles.location IS 'Geographical location or service area';
COMMENT ON COLUMN public.profiles.website_url IS 'Professional website or portfolio URL';
COMMENT ON COLUMN public.profiles.social_links IS 'JSON object containing social media profile links';
COMMENT ON COLUMN public.profiles.last_active IS 'Timestamp of last activity for presence indication';

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Enhanced profiles table schema completed successfully!';
    RAISE NOTICE 'Added phone, company_name, avatar_url, timezone and other missing columns';
    RAISE NOTICE 'Enhanced booking details component should now work properly';
    RAISE NOTICE 'All existing profiles updated with sensible defaults';
    RAISE NOTICE 'Professional profile features now available';
END $$;
