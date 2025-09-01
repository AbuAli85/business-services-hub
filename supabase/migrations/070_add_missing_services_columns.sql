-- Migration: Add Missing Services Columns for Enhanced Booking Details
-- Description: Add estimated_duration, requirements, and other missing columns to services table
-- Date: 2024-12-20

-- Add estimated_duration column to services table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'estimated_duration'
    ) THEN
        ALTER TABLE public.services ADD COLUMN estimated_duration TEXT DEFAULT '2 hours';
        RAISE NOTICE 'Added estimated_duration column to services table';
    ELSE
        RAISE NOTICE 'estimated_duration column already exists in services table';
    END IF;
END $$;

-- Add requirements column to services table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'requirements'
    ) THEN
        ALTER TABLE public.services ADD COLUMN requirements TEXT;
        RAISE NOTICE 'Added requirements column to services table';
    ELSE
        RAISE NOTICE 'requirements column already exists in services table';
    END IF;
END $$;

-- Add delivery_timeframe column (if different from estimated_duration)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'delivery_timeframe'
    ) THEN
        ALTER TABLE public.services ADD COLUMN delivery_timeframe TEXT;
        RAISE NOTICE 'Added delivery_timeframe column to services table';
    ELSE
        RAISE NOTICE 'delivery_timeframe column already exists in services table';
    END IF;
END $$;

-- Add service_type column for better categorization
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'service_type'
    ) THEN
        ALTER TABLE public.services ADD COLUMN service_type TEXT DEFAULT 'standard' CHECK (service_type IN ('standard', 'premium', 'enterprise', 'consultation'));
        RAISE NOTICE 'Added service_type column to services table';
    ELSE
        RAISE NOTICE 'service_type column already exists in services table';
    END IF;
END $$;

-- Add availability_schedule column for booking management
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'availability_schedule'
    ) THEN
        ALTER TABLE public.services ADD COLUMN availability_schedule JSONB DEFAULT '{"flexible": true, "days": ["monday", "tuesday", "wednesday", "thursday", "friday"], "hours": {"start": "09:00", "end": "17:00"}}';
        RAISE NOTICE 'Added availability_schedule column to services table';
    ELSE
        RAISE NOTICE 'availability_schedule column already exists in services table';
    END IF;
END $$;

-- Add minimum_notice column for booking requirements
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'minimum_notice'
    ) THEN
        ALTER TABLE public.services ADD COLUMN minimum_notice TEXT DEFAULT '24 hours';
        RAISE NOTICE 'Added minimum_notice column to services table';
    ELSE
        RAISE NOTICE 'minimum_notice column already exists in services table';
    END IF;
END $$;

-- Add max_advance_booking column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'max_advance_booking'
    ) THEN
        ALTER TABLE public.services ADD COLUMN max_advance_booking TEXT DEFAULT '3 months';
        RAISE NOTICE 'Added max_advance_booking column to services table';
    ELSE
        RAISE NOTICE 'max_advance_booking column already exists in services table';
    END IF;
END $$;

-- Add portfolio_samples column for showcasing work
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'portfolio_samples'
    ) THEN
        ALTER TABLE public.services ADD COLUMN portfolio_samples TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added portfolio_samples column to services table';
    ELSE
        RAISE NOTICE 'portfolio_samples column already exists in services table';
    END IF;
END $$;

-- Add pricing_model column for flexible pricing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'pricing_model'
    ) THEN
        ALTER TABLE public.services ADD COLUMN pricing_model TEXT DEFAULT 'fixed' CHECK (pricing_model IN ('fixed', 'hourly', 'project', 'package', 'consultation'));
        RAISE NOTICE 'Added pricing_model column to services table';
    ELSE
        RAISE NOTICE 'pricing_model column already exists in services table';
    END IF;
END $$;

-- Add location_preferences column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'services' 
        AND column_name = 'location_preferences'
    ) THEN
        ALTER TABLE public.services ADD COLUMN location_preferences TEXT[] DEFAULT '{"on_site", "remote"}';
        RAISE NOTICE 'Added location_preferences column to services table';
    ELSE
        RAISE NOTICE 'location_preferences column already exists in services table';
    END IF;
END $$;

-- Update existing services with default values
UPDATE public.services 
SET 
    estimated_duration = COALESCE(estimated_duration, '2 hours'),
    requirements = COALESCE(requirements, 'Basic requirements will be discussed during consultation.'),
    service_type = COALESCE(service_type, 'standard'),
    minimum_notice = COALESCE(minimum_notice, '24 hours'),
    max_advance_booking = COALESCE(max_advance_booking, '3 months'),
    pricing_model = COALESCE(pricing_model, 'fixed')
WHERE 
    estimated_duration IS NULL 
    OR requirements IS NULL 
    OR service_type IS NULL 
    OR minimum_notice IS NULL 
    OR max_advance_booking IS NULL 
    OR pricing_model IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_estimated_duration ON public.services(estimated_duration);
CREATE INDEX IF NOT EXISTS idx_services_service_type ON public.services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_pricing_model ON public.services(pricing_model);
CREATE INDEX IF NOT EXISTS idx_services_availability_schedule ON public.services USING GIN(availability_schedule);
CREATE INDEX IF NOT EXISTS idx_services_portfolio_samples ON public.services USING GIN(portfolio_samples);
CREATE INDEX IF NOT EXISTS idx_services_location_preferences ON public.services USING GIN(location_preferences);

-- Update RLS policies to include new columns in SELECT permissions
DROP POLICY IF EXISTS "Anyone can view active services with enhanced details" ON public.services;
CREATE POLICY "Anyone can view active services with enhanced details" ON public.services
    FOR SELECT USING (
        status = 'active' OR 
        status = 'approved' OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions for new columns
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN public.services.estimated_duration IS 'Expected time to complete the service (e.g., "2 hours", "3 days", "1 week")';
COMMENT ON COLUMN public.services.requirements IS 'Detailed requirements and prerequisites for the service';
COMMENT ON COLUMN public.services.service_type IS 'Type of service: standard, premium, enterprise, or consultation';
COMMENT ON COLUMN public.services.availability_schedule IS 'JSON object defining when the service is available';
COMMENT ON COLUMN public.services.minimum_notice IS 'Minimum advance notice required for booking';
COMMENT ON COLUMN public.services.max_advance_booking IS 'Maximum time in advance bookings can be made';
COMMENT ON COLUMN public.services.portfolio_samples IS 'Array of URLs or descriptions of previous work samples';
COMMENT ON COLUMN public.services.pricing_model IS 'How the service is priced: fixed, hourly, project, package, or consultation';
COMMENT ON COLUMN public.services.location_preferences IS 'Array of supported location types: on_site, remote, hybrid';

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Enhanced services table schema completed successfully!';
    RAISE NOTICE 'Added estimated_duration, requirements, and other missing columns';
    RAISE NOTICE 'Enhanced booking details component should now work properly';
    RAISE NOTICE 'All existing services updated with sensible defaults';
END $$;
