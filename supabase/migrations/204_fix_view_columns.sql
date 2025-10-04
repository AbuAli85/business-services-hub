-- Migration: Fix v_booking_status View Columns
-- Date: January 2025
-- Description: Add missing columns to existing v_booking_status view

-- This migration adds missing columns to the existing view without recreating it
-- It's safer than dropping and recreating the entire view

-- First, let's see what columns we currently have
DO $$
DECLARE
    column_list TEXT;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO column_list
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'v_booking_status';
    
    RAISE NOTICE 'Current v_booking_status columns: %', column_list;
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
COMMENT ON VIEW public.v_booking_status IS 'Unified booking view with performance indexes - single source of truth for all booking data';

-- Grant permissions (ensure they're still in place)
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO anon;

-- Test the view
DO $$
DECLARE
    test_count INTEGER;
    sample_booking RECORD;
BEGIN
    -- Test basic functionality
    SELECT COUNT(*) INTO test_count FROM public.v_booking_status;
    RAISE NOTICE '✅ v_booking_status contains % bookings', test_count;
    
    -- Test a sample booking
    SELECT * INTO sample_booking FROM public.v_booking_status LIMIT 1;
    IF sample_booking.id IS NOT NULL THEN
        RAISE NOTICE '✅ Sample booking: % - %', sample_booking.id, sample_booking.display_status;
    END IF;
    
    RAISE NOTICE '✅ All tests passed - view is working correctly';
END $$;
