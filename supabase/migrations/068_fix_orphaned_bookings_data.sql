-- Fix orphaned bookings data before applying foreign key constraints
-- This migration cleans up data integrity issues and ensures all foreign key relationships are valid

-- First, let's identify and fix orphaned booking records
DO $$
DECLARE
    orphaned_count INTEGER;
    fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting orphaned bookings cleanup...';
    
    -- Check for bookings with invalid client_id references
    SELECT COUNT(*) INTO orphaned_count
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.client_id = p.id
    WHERE b.client_id IS NOT NULL AND p.id IS NULL;
    
    RAISE NOTICE 'Found % bookings with invalid client_id references', orphaned_count;
    
    -- Check for bookings with invalid provider_id references
    SELECT COUNT(*) INTO orphaned_count
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.provider_id = p.id
    WHERE b.provider_id IS NOT NULL AND p.id IS NULL;
    
    RAISE NOTICE 'Found % bookings with invalid provider_id references', orphaned_count;
    
    -- Check for bookings with invalid service_id references
    SELECT COUNT(*) INTO orphaned_count
    FROM public.bookings b
    LEFT JOIN public.services s ON b.service_id = s.id
    WHERE b.service_id IS NOT NULL AND s.id IS NULL;
    
    RAISE NOTICE 'Found % bookings with invalid service_id references', orphaned_count;
END $$;

-- Option 1: Create missing profiles for orphaned user IDs (safer approach)
-- This creates placeholder profiles for any missing user references
INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    role, 
    created_at, 
    updated_at
)
SELECT DISTINCT
    missing_id,
    'Unknown User',
    'unknown-' || LEFT(missing_id::text, 8) || '@placeholder.com',
    CASE 
        WHEN missing_type = 'client' THEN 'client'
        WHEN missing_type = 'provider' THEN 'provider'
        ELSE 'client'
    END,
    NOW(),
    NOW()
FROM (
    -- Missing client_id references
    SELECT b.client_id as missing_id, 'client' as missing_type
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.client_id = p.id
    WHERE b.client_id IS NOT NULL AND p.id IS NULL
    
    UNION
    
    -- Missing provider_id references  
    SELECT b.provider_id as missing_id, 'provider' as missing_type
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.provider_id = p.id
    WHERE b.provider_id IS NOT NULL AND p.id IS NULL
) missing_users
WHERE missing_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- Option 2: Create missing services for orphaned service IDs
INSERT INTO public.services (
    id,
    title,
    description,
    category,
    base_price,
    currency,
    status,
    provider_id,
    created_at,
    updated_at
)
SELECT DISTINCT
    b.service_id,
    'Unknown Service',
    'This service was referenced by a booking but the original service record was missing.',
    'General',
    0,
    'OMR',
    'draft',
    COALESCE(b.provider_id, (SELECT id FROM public.profiles WHERE role = 'provider' LIMIT 1)),
    NOW(),
    NOW()
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
WHERE b.service_id IS NOT NULL AND s.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update any NULL foreign key references to valid defaults
DO $$
DECLARE
    default_client_id UUID;
    default_provider_id UUID;
    default_service_id UUID;
    updated_count INTEGER;
BEGIN
    -- Get or create default entities
    
    -- Default client profile
    INSERT INTO public.profiles (id, full_name, email, role, created_at)
    VALUES (gen_random_uuid(), 'Default Client', 'default-client@system.local', 'client', NOW())
    ON CONFLICT (email) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        updated_at = NOW()
    RETURNING id INTO default_client_id;
    
    IF default_client_id IS NULL THEN
        SELECT id INTO default_client_id 
        FROM public.profiles 
        WHERE email = 'default-client@system.local' 
        LIMIT 1;
    END IF;
    
    -- Default provider profile
    INSERT INTO public.profiles (id, full_name, email, role, created_at)
    VALUES (gen_random_uuid(), 'Default Provider', 'default-provider@system.local', 'provider', NOW())
    ON CONFLICT (email) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        updated_at = NOW()
    RETURNING id INTO default_provider_id;
    
    IF default_provider_id IS NULL THEN
        SELECT id INTO default_provider_id 
        FROM public.profiles 
        WHERE email = 'default-provider@system.local' 
        LIMIT 1;
    END IF;
    
    -- Default service
    INSERT INTO public.services (id, title, description, category, base_price, currency, status, provider_id, created_at)
    VALUES (
        gen_random_uuid(),
        'Default Service', 
        'Default service for bookings with missing service references',
        'General',
        0,
        'OMR',
        'draft',
        default_provider_id,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        updated_at = NOW()
    RETURNING id INTO default_service_id;
    
    -- Update bookings with NULL client_id
    UPDATE public.bookings 
    SET client_id = default_client_id 
    WHERE client_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % bookings with NULL client_id', updated_count;
    
    -- Update bookings with NULL provider_id
    UPDATE public.bookings 
    SET provider_id = default_provider_id 
    WHERE provider_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % bookings with NULL provider_id', updated_count;
    
    -- Update bookings with NULL service_id
    UPDATE public.bookings 
    SET service_id = default_service_id 
    WHERE service_id IS NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % bookings with NULL service_id', updated_count;
    
    RAISE NOTICE 'Data cleanup completed with default entities:';
    RAISE NOTICE 'Default client ID: %', default_client_id;
    RAISE NOTICE 'Default provider ID: %', default_provider_id;
    RAISE NOTICE 'Default service ID: %', default_service_id;
END $$;

-- Verify data integrity before applying constraints
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    RAISE NOTICE 'Verifying data integrity...';
    
    -- Check for remaining invalid client_id references
    SELECT COUNT(*) INTO invalid_count
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.client_id = p.id
    WHERE b.client_id IS NOT NULL AND p.id IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Still have % bookings with invalid client_id references', invalid_count;
    END IF;
    
    -- Check for remaining invalid provider_id references
    SELECT COUNT(*) INTO invalid_count
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.provider_id = p.id
    WHERE b.provider_id IS NOT NULL AND p.id IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Still have % bookings with invalid provider_id references', invalid_count;
    END IF;
    
    -- Check for remaining invalid service_id references
    SELECT COUNT(*) INTO invalid_count
    FROM public.bookings b
    LEFT JOIN public.services s ON b.service_id = s.id
    WHERE b.service_id IS NOT NULL AND s.id IS NULL;
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Still have % bookings with invalid service_id references', invalid_count;
    END IF;
    
    RAISE NOTICE 'Data integrity verification passed!';
END $$;

-- Now safely drop and recreate foreign key constraints
ALTER TABLE IF EXISTS public.bookings 
DROP CONSTRAINT IF EXISTS bookings_client_id_fkey,
DROP CONSTRAINT IF EXISTS bookings_provider_id_fkey,
DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;

-- Re-add the foreign key constraints
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_provider_id_fkey 
FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_service_id_fkey 
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

-- Add enhanced booking fields if they don't exist (from previous migration)
DO $$
BEGIN
    -- Progress tracking
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'progress_percentage') THEN
        ALTER TABLE public.bookings ADD COLUMN progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
    END IF;
    
    -- Priority level
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'priority') THEN
        ALTER TABLE public.bookings ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
    END IF;
    
    -- Payment status
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'overdue'));
    END IF;
    
    -- Estimated duration
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'estimated_duration') THEN
        ALTER TABLE public.bookings ADD COLUMN estimated_duration TEXT DEFAULT '2 hours';
    END IF;
    
    -- Location type
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'location_type') THEN
        ALTER TABLE public.bookings ADD COLUMN location_type TEXT DEFAULT 'on_site' CHECK (location_type IN ('on_site', 'remote', 'hybrid'));
    END IF;
    
    -- Notes field
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'notes') THEN
        ALTER TABLE public.bookings ADD COLUMN notes TEXT;
    END IF;
    
    RAISE NOTICE 'Enhanced booking fields added successfully';
END $$;

-- Add enhanced profile fields
DO $$
BEGIN
    -- Availability status
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'availability_status') THEN
        ALTER TABLE public.profiles ADD COLUMN availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'away', 'offline'));
    END IF;
    
    -- Response time
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'response_time') THEN
        ALTER TABLE public.profiles ADD COLUMN response_time TEXT DEFAULT '< 1 hour';
    END IF;
    
    -- Rating
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'rating') THEN
        ALTER TABLE public.profiles ADD COLUMN rating NUMERIC(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5);
    END IF;
    
    RAISE NOTICE 'Enhanced profile fields added successfully';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_progress_percentage ON public.bookings(progress_percentage);
CREATE INDEX IF NOT EXISTS idx_bookings_priority ON public.bookings(priority);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- Update RLS policies for enhanced booking details
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

-- Grant permissions
GRANT ALL ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;
GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;

-- Force schema cache refresh
COMMENT ON TABLE public.bookings IS 'Enhanced bookings with clean foreign key relationships - Updated: 2024-12-20';
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Orphaned bookings data cleanup completed successfully!';
    RAISE NOTICE 'Foreign key constraints applied with proper data integrity';
    RAISE NOTICE 'Enhanced booking details schema is now ready for production use';
END $$;
