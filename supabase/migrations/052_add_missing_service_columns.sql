-- Migration: Add Missing Service Columns
-- Description: Add terms_conditions, cancellation_policy, and other missing columns to services table
-- Date: 2024-12-19

-- Add terms_conditions column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'terms_conditions'
    ) THEN
        ALTER TABLE public.services ADD COLUMN terms_conditions TEXT;
        RAISE NOTICE 'Added terms_conditions column to services table';
    ELSE
        RAISE NOTICE 'terms_conditions column already exists in services table';
    END IF;
END $$;

-- Add cancellation_policy column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'cancellation_policy'
    ) THEN
        ALTER TABLE public.services ADD COLUMN cancellation_policy TEXT;
        RAISE NOTICE 'Added cancellation_policy column to services table';
    ELSE
        RAISE NOTICE 'cancellation_policy column already exists in services table';
    END IF;
END $$;

-- Add approval_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE public.services ADD COLUMN approval_status TEXT DEFAULT 'pending';
        RAISE NOTICE 'Added approval_status column to services table';
    ELSE
        RAISE NOTICE 'approval_status column already exists in services table';
    END IF;
END $$;

-- Add tags column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'tags'
    ) THEN
        ALTER TABLE public.services ADD COLUMN tags TEXT[];
        RAISE NOTICE 'Added tags column to services table';
    ELSE
        RAISE NOTICE 'tags column already exists in services table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_approval_status ON public.services(approval_status);
CREATE INDEX IF NOT EXISTS idx_services_tags ON public.services USING GIN(tags);

-- Update existing services to have default approval_status
UPDATE public.services SET approval_status = 'approved' WHERE approval_status IS NULL;
