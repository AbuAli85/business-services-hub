-- Migration: Add Digital Marketing Fields to Services
-- Description: Add delivery_timeframe, revision_policy, and tags columns to services table
-- Date: 2024-12-19

-- Add delivery_timeframe column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'delivery_timeframe'
    ) THEN
        ALTER TABLE public.services ADD COLUMN delivery_timeframe VARCHAR(100);
        RAISE NOTICE 'Added delivery_timeframe column to services table';
    ELSE
        RAISE NOTICE 'delivery_timeframe column already exists in services table';
    END IF;
END $$;

-- Add revision_policy column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'revision_policy'
    ) THEN
        ALTER TABLE public.services ADD COLUMN revision_policy VARCHAR(100);
        RAISE NOTICE 'Added revision_policy column to services table';
    ELSE
        RAISE NOTICE 'revision_policy column already exists in services table';
    END IF;
END $$;

-- Add requirements column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'requirements'
    ) THEN
        ALTER TABLE public.services ADD COLUMN requirements TEXT;
        RAISE NOTICE 'Added requirements column to services table';
    ELSE
        RAISE NOTICE 'requirements column already exists in services table';
    END IF;
END $$;

-- Add tags column as TEXT array
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

-- Add views_count and bookings_count for analytics
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'views_count'
    ) THEN
        ALTER TABLE public.services ADD COLUMN views_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views_count column to services table';
    ELSE
        RAISE NOTICE 'views_count column already exists in services table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'bookings_count'
    ) THEN
        ALTER TABLE public.services ADD COLUMN bookings_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added bookings_count column to services table';
    ELSE
        RAISE NOTICE 'bookings_count column already exists in services table';
    END IF;
END $$;

-- Add rating column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'rating'
    ) THEN
        ALTER TABLE public.services ADD COLUMN rating NUMERIC(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5);
        RAISE NOTICE 'Added rating column to services table';
    ELSE
        RAISE NOTICE 'rating column already exists in services table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_delivery_timeframe ON public.services(delivery_timeframe);
CREATE INDEX IF NOT EXISTS idx_services_revision_policy ON public.services(revision_policy);
CREATE INDEX IF NOT EXISTS idx_services_requirements ON public.services(requirements);
CREATE INDEX IF NOT EXISTS idx_services_tags ON public.services USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_services_views_count ON public.services(views_count);
CREATE INDEX IF NOT EXISTS idx_services_bookings_count ON public.services(bookings_count);
CREATE INDEX IF NOT EXISTS idx_services_rating ON public.services(rating);

-- Add comments for documentation
COMMENT ON COLUMN public.services.delivery_timeframe IS 'Expected delivery timeframe for the service (e.g., "7-14 days")';
COMMENT ON COLUMN public.services.revision_policy IS 'Revision policy for the service (e.g., "2 revisions included")';
COMMENT ON COLUMN public.services.requirements IS 'Information about what clients need to provide for the service';
COMMENT ON COLUMN public.services.tags IS 'Array of tags/keywords to help clients discover the service';
COMMENT ON COLUMN public.services.views_count IS 'Number of times the service has been viewed';
COMMENT ON COLUMN public.services.bookings_count IS 'Number of bookings for this service';
COMMENT ON COLUMN public.services.rating IS 'Average rating of the service (0.00 to 5.00)';

-- Update RLS policies to include new columns
-- Note: This assumes the existing RLS policies are working correctly
-- The new columns will inherit the same access patterns as the existing ones

RAISE NOTICE 'Migration 047_add_digital_marketing_fields completed successfully';
