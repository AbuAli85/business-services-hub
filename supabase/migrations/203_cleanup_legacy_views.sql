-- Migration: Cleanup Legacy Booking Views
-- Date: January 2025
-- Description: Remove unused legacy views to consolidate on v_booking_status

-- Drop legacy views that are no longer needed
-- These views have been replaced by the unified v_booking_status view

DROP VIEW IF EXISTS public.booking_enriched CASCADE;
DROP VIEW IF EXISTS public.enhanced_bookings CASCADE;
DROP VIEW IF EXISTS public.bookings_full_view CASCADE;

-- Add comment for documentation
COMMENT ON VIEW public.v_booking_status IS 'Unified booking view - single source of truth for all booking data with proper joins, derived status, and progress calculation';

-- Verify the main view still exists and is accessible
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'v_booking_status'
    ) THEN
        RAISE EXCEPTION 'v_booking_status view does not exist! Please run migration 201_unified_booking_status_view.sql first.';
    END IF;
    
    RAISE NOTICE 'Legacy views cleaned up successfully. v_booking_status is now the single source of truth.';
END $$;
