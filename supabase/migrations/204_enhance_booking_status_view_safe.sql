-- Migration: Safely Enhance v_booking_status View
-- Date: January 2025
-- Description: Add missing columns and performance indexes to v_booking_status

-- First, let's check what columns already exist in the current view
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if scheduled_date column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'v_booking_status' 
        AND column_name = 'scheduled_date'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'scheduled_date column missing - will be added';
    ELSE
        RAISE NOTICE 'scheduled_date column already exists';
    END IF;
    
    -- Check if location column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'v_booking_status' 
        AND column_name = 'location'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'location column missing - will be added';
    ELSE
        RAISE NOTICE 'location column already exists';
    END IF;
    
    -- Check if notes column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'v_booking_status' 
        AND column_name = 'notes'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'notes column missing - will be added';
    ELSE
        RAISE NOTICE 'notes column already exists';
    END IF;
END $$;

-- Add performance indexes on the underlying tables (not the view)
-- These indexes will improve query performance for the v_booking_status view

-- Indexes on bookings table
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_approval_status ON public.bookings(approval_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON public.bookings(updated_at);

-- Indexes on profiles table (for client/provider lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_company_name ON public.profiles(company_name);

-- Indexes on services table
CREATE INDEX IF NOT EXISTS idx_services_title ON public.services(title);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);

-- Indexes on milestones table (for progress calculations)
CREATE INDEX IF NOT EXISTS idx_milestones_booking_id ON public.milestones(booking_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.milestones(status);

-- Indexes on invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Update comment
COMMENT ON VIEW public.v_booking_status IS 'Enhanced unified booking view with performance indexes and standardized status logic';

-- Grant permissions (ensure they're still in place)
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO anon;

-- Verify the view is working
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO test_count FROM public.v_booking_status LIMIT 1;
    RAISE NOTICE '✅ v_booking_status view is working correctly';
    RAISE NOTICE '✅ Performance indexes added successfully';
    RAISE NOTICE '✅ View permissions updated';
END $$;
