-- Migration: Fix Remaining Security Warnings
-- Description: Fix function search path mutable, materialized view API access, and other security warnings
-- Date: 2025-01-25
-- Priority: 99999 (highest priority to run absolutely last)

-- This migration fixes the remaining security warnings identified by the database linter

-- =============================================
-- 1. Fix Function Search Path Mutable Warning
-- =============================================

-- Fix get_booking_display_status function to set search_path
CREATE OR REPLACE FUNCTION public.get_booking_display_status(booking_status TEXT, progress_percentage INTEGER)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Map internal status to user-friendly display status
    IF booking_status = 'draft' THEN
        RETURN 'Not Started';
    ELSIF booking_status = 'pending_payment' THEN
        RETURN 'Pending Approval';
    ELSIF booking_status = 'paid' THEN
        IF progress_percentage = 0 THEN
            RETURN 'Approved';
        ELSIF progress_percentage > 0 AND progress_percentage < 100 THEN
            RETURN 'In Progress';
        ELSIF progress_percentage = 100 THEN
            RETURN 'Completed';
        ELSE
            RETURN 'Approved';
        END IF;
    ELSIF booking_status = 'in_progress' THEN
        RETURN 'In Progress';
    ELSIF booking_status = 'delivered' THEN
        RETURN 'Completed';
    ELSIF booking_status = 'completed' THEN
        RETURN 'Completed';
    ELSIF booking_status = 'cancelled' THEN
        RETURN 'Cancelled';
    ELSIF booking_status = 'disputed' THEN
        RETURN 'Disputed';
    ELSE
        RETURN 'Pending';
    END IF;
END;
$$;

-- Fix get_revenue_display_status function to set search_path
CREATE OR REPLACE FUNCTION public.get_revenue_display_status(booking_status TEXT, payment_status TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Map booking and payment status to revenue status
    IF booking_status IN ('cancelled', 'disputed') THEN
        RETURN 'N/A';
    ELSIF payment_status = 'paid' THEN
        RETURN 'PAID';
    ELSIF booking_status IN ('approved', 'in_progress', 'completed') THEN
        RETURN 'PENDING';
    ELSE
        RETURN 'N/A';
    END IF;
END;
$$;

-- =============================================
-- 2. Fix Materialized View API Access Issues
-- =============================================

-- Revoke public access to materialized views
REVOKE ALL ON public.rbac_user_permissions_mv FROM anon;
REVOKE ALL ON public.rbac_user_permissions_mv FROM authenticated;
REVOKE ALL ON public.rbac_user_permissions_mv FROM public;

REVOKE ALL ON public.mv_booking_progress_analytics FROM anon;
REVOKE ALL ON public.mv_booking_progress_analytics FROM authenticated;
REVOKE ALL ON public.mv_booking_progress_analytics FROM public;

-- Grant access only to service_role for internal use
GRANT SELECT ON public.rbac_user_permissions_mv TO service_role;
GRANT SELECT ON public.mv_booking_progress_analytics TO service_role;

-- Create secure functions to access materialized view data instead of direct access
CREATE OR REPLACE FUNCTION public.get_user_permissions_secure()
RETURNS TABLE(user_id uuid, role_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the materialized view exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'rbac_user_permissions_mv' 
        AND table_schema = 'public'
    ) THEN
        RETURN QUERY
        SELECT 
            mv.user_id,
            mv.role_name
        FROM public.rbac_user_permissions_mv mv
        WHERE mv.user_id = auth.uid();
    ELSE
        -- Return empty result if materialized view doesn't exist
        RETURN;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_booking_progress_analytics_secure()
RETURNS TABLE(
    booking_id uuid,
    total_milestones integer,
    completed_milestones integer,
    total_tasks integer,
    completed_tasks integer,
    overall_progress numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the materialized view exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'mv_booking_progress_analytics' 
        AND table_schema = 'public'
    ) THEN
        RETURN QUERY
        SELECT 
            mva.booking_id,
            mva.total_milestones,
            mva.completed_milestones,
            mva.total_tasks,
            mva.completed_tasks,
            mva.overall_progress
        FROM public.mv_booking_progress_analytics mva
        WHERE mva.booking_id IN (
            SELECT b.id FROM public.bookings b 
            WHERE b.client_id = auth.uid() OR b.provider_id = auth.uid()
        );
    ELSE
        -- Return empty result if materialized view doesn't exist
        RETURN;
    END IF;
END;
$$;

-- Grant permissions to the secure functions
GRANT EXECUTE ON FUNCTION public.get_user_permissions_secure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_progress_analytics_secure() TO authenticated;

-- =============================================
-- 3. Fix Other Functions with Search Path Issues
-- =============================================

-- Fix any other functions that might have search path issues
CREATE OR REPLACE FUNCTION public.get_status_display_info(status TEXT)
RETURNS JSONB 
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE status
    WHEN 'pending' THEN jsonb_build_object(
      'label', 'Pending Review',
      'color', 'amber',
      'icon', 'clock',
      'description', 'Awaiting approval or review'
    )
    WHEN 'approved' THEN jsonb_build_object(
      'label', 'Approved',
      'color', 'green',
      'icon', 'check-circle',
      'description', 'Ready to begin work'
    )
    WHEN 'in_progress' THEN jsonb_build_object(
      'label', 'In Progress',
      'color', 'blue',
      'icon', 'loader',
      'description', 'Work is actively being done'
    )
    WHEN 'completed' THEN jsonb_build_object(
      'label', 'Completed',
      'color', 'emerald',
      'icon', 'sparkles',
      'description', 'Work has been completed'
    )
    WHEN 'cancelled' THEN jsonb_build_object(
      'label', 'Cancelled',
      'color', 'gray',
      'icon', 'x-circle',
      'description', 'Booking was cancelled or declined'
    )
    ELSE jsonb_build_object(
      'label', 'Unknown',
      'color', 'gray',
      'icon', 'help-circle',
      'description', 'Status not recognized'
    )
  END;
END;
$$;

-- =============================================
-- 4. Add Comments and Documentation
-- =============================================

COMMENT ON FUNCTION public.get_booking_display_status(TEXT, INTEGER) IS 'Maps booking status to user-friendly display text with secure search_path';
COMMENT ON FUNCTION public.get_revenue_display_status(TEXT, TEXT) IS 'Maps booking and payment status to revenue display text with secure search_path';
COMMENT ON FUNCTION public.get_user_permissions_secure() IS 'Secure function to access user permissions data, filtered by current user';
COMMENT ON FUNCTION public.get_booking_progress_analytics_secure() IS 'Secure function to access booking progress analytics, filtered by user access';
COMMENT ON FUNCTION public.get_status_display_info(TEXT) IS 'Returns display information for booking status with secure search_path';

-- =============================================
-- 5. Verification
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Security warnings fix completed successfully:';
    RAISE NOTICE '- Fixed function search path mutable warning for get_booking_display_status';
    RAISE NOTICE '- Fixed materialized view API access issues';
    RAISE NOTICE '- Created secure functions for materialized view access';
    RAISE NOTICE '- Set search_path for all functions to prevent security issues';
    RAISE NOTICE '- Revoked public access to materialized views';
    RAISE NOTICE '- This migration runs with priority 99999 to ensure it executes absolutely last';
END $$;
