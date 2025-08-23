-- Check current table structure and add missing columns if needed
-- This migration will help us understand what columns exist

-- First, let's see what columns we actually have
DO $$
BEGIN
    -- Check if title column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'title'
    ) THEN
        ALTER TABLE public.services ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column to services table';
    ELSE
        RAISE NOTICE 'Title column already exists in services table';
    END IF;
    
    -- Check if provider_id column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE public.services ADD COLUMN provider_id UUID REFERENCES public.profiles(id);
        RAISE NOTICE 'Added provider_id column to services table';
    ELSE
        RAISE NOTICE 'Provider_id column already exists in services table';
    END IF;
    
    -- Check if other required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.services ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to services table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'category'
    ) THEN
        ALTER TABLE public.services ADD COLUMN category TEXT;
        RAISE NOTICE 'Added category column to services table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.services ADD COLUMN status TEXT DEFAULT 'active';
        RAISE NOTICE 'Added status column to services table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'base_price'
    ) THEN
        ALTER TABLE public.services ADD COLUMN base_price NUMERIC(12,3) DEFAULT 0;
        RAISE NOTICE 'Added base_price column to services table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.services ADD COLUMN currency TEXT DEFAULT 'OMR';
        RAISE NOTICE 'Added currency column to services table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.services ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Added created_at column to services table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.services ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Added updated_at column to services table';
    END IF;
END $$;
