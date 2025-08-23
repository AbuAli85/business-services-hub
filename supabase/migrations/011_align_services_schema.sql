-- Align services table schema with expected structure
-- This migration ensures the services table has the correct columns

-- Check if service_name column exists and handle properly
DO $$
BEGIN
    -- Check if both service_name and title columns exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'service_name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'title'
    ) THEN
        -- Both columns exist, copy data from service_name to title and drop service_name
        UPDATE public.services SET title = service_name WHERE title IS NULL OR title = '';
        ALTER TABLE public.services DROP COLUMN service_name;
        RAISE NOTICE 'Copied data from service_name to title and dropped service_name column';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'service_name'
    ) THEN
        -- Only service_name exists, rename it to title
        ALTER TABLE public.services RENAME COLUMN service_name TO title;
        RAISE NOTICE 'Renamed service_name column to title';
    ELSE
        RAISE NOTICE 'Title column already exists';
    END IF;

    -- Ensure title column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'title'
    ) THEN
        ALTER TABLE public.services ADD COLUMN title TEXT NOT NULL;
        RAISE NOTICE 'Added title column to services table';
    ELSE
        RAISE NOTICE 'Title column confirmed to exist in services table';
    END IF;

    -- Ensure provider_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE public.services ADD COLUMN provider_id UUID REFERENCES public.profiles(id);
        RAISE NOTICE 'Added provider_id column to services table';
    END IF;

    -- Ensure other required columns exist
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

-- Grant necessary permissions
GRANT ALL ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
