-- Migration: Add Social Media Columns to Profiles Table
-- Description: Add missing social media columns (linkedin, twitter, instagram, facebook) to profiles table
-- Date: 2024-12-20

-- Add linkedin column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'linkedin'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN linkedin TEXT;
        RAISE NOTICE 'Added linkedin column to profiles table';
    ELSE
        RAISE NOTICE 'linkedin column already exists in profiles table';
    END IF;
END $$;

-- Add twitter column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'twitter'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN twitter TEXT;
        RAISE NOTICE 'Added twitter column to profiles table';
    ELSE
        RAISE NOTICE 'twitter column already exists in profiles table';
    END IF;
END $$;

-- Add instagram column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'instagram'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN instagram TEXT;
        RAISE NOTICE 'Added instagram column to profiles table';
    ELSE
        RAISE NOTICE 'instagram column already exists in profiles table';
    END IF;
END $$;

-- Add facebook column to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'facebook'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN facebook TEXT;
        RAISE NOTICE 'Added facebook column to profiles table';
    ELSE
        RAISE NOTICE 'facebook column already exists in profiles table';
    END IF;
END $$;

-- Add website column to profiles table (if not already exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'profiles' 
        AND column_name = 'website'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN website TEXT;
        RAISE NOTICE 'Added website column to profiles table';
    ELSE
        RAISE NOTICE 'website column already exists in profiles table';
    END IF;
END $$;

-- Add comments for the new columns
COMMENT ON COLUMN public.profiles.linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN public.profiles.twitter IS 'Twitter profile URL';
COMMENT ON COLUMN public.profiles.instagram IS 'Instagram profile URL';
COMMENT ON COLUMN public.profiles.facebook IS 'Facebook profile URL';
COMMENT ON COLUMN public.profiles.website IS 'Personal or business website URL';

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Social media columns added to profiles table successfully!';
END $$;
