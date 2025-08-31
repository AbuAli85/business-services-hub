-- Migration: Fix Service Packages Table Schema
-- Description: Add missing columns to service_packages table that the application expects
-- Date: 2024-12-19

-- Add description column to service_packages table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_packages' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.service_packages ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to service_packages table';
    ELSE
        RAISE NOTICE 'description column already exists in service_packages table';
    END IF;
END $$;

-- Add missing columns that might be needed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_packages' 
        AND column_name = 'delivery_days'
    ) THEN
        ALTER TABLE public.service_packages ADD COLUMN delivery_days INTEGER DEFAULT 1;
        RAISE NOTICE 'Added delivery_days column to service_packages table';
    ELSE
        RAISE NOTICE 'delivery_days column already exists in service_packages table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_packages' 
        AND column_name = 'revisions'
    ) THEN
        ALTER TABLE public.service_packages ADD COLUMN revisions INTEGER DEFAULT 1;
        RAISE NOTICE 'Added revisions column to service_packages table';
    ELSE
        RAISE NOTICE 'revisions column already exists in service_packages table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_packages' 
        AND column_name = 'features'
    ) THEN
        ALTER TABLE public.service_packages ADD COLUMN features TEXT[];
        RAISE NOTICE 'Added features column to service_packages table';
    ELSE
        RAISE NOTICE 'features column already exists in service_packages table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_packages_service_id ON public.service_packages(service_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_price ON public.service_packages(price);

-- Update existing records to have default values where needed
UPDATE public.service_packages SET delivery_days = 1 WHERE delivery_days IS NULL;
UPDATE public.service_packages SET revisions = 1 WHERE revisions IS NULL;
UPDATE public.service_packages SET features = '{}' WHERE features IS NULL;
