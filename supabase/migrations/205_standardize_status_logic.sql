-- Migration: Standardize Booking Status Logic
-- Date: January 2025
-- Description: Create standardized status mapping functions and ensure consistency

-- Create a function to standardize booking statuses
CREATE OR REPLACE FUNCTION public.standardize_booking_status(
  raw_status TEXT,
  approval_status TEXT DEFAULT NULL,
  progress_percentage NUMERIC DEFAULT 0
) RETURNS TEXT AS $$
BEGIN
  -- Handle cancelled/declined statuses
  IF raw_status IN ('cancelled', 'declined', 'rejected') THEN
    RETURN 'cancelled';
  END IF;
  
  -- Handle pending statuses
  IF raw_status IN ('requested', 'pending_review', 'draft') THEN
    RETURN 'pending';
  END IF;
  
  -- Handle approved statuses
  IF raw_status IN ('approved', 'accepted', 'confirmed') THEN
    -- If approved but no progress, still approved
    IF progress_percentage = 0 THEN
      RETURN 'approved';
    -- If approved with progress but not complete, in progress
    ELSIF progress_percentage > 0 AND progress_percentage < 100 THEN
      RETURN 'in_progress';
    -- If approved and complete, completed
    ELSIF progress_percentage >= 100 THEN
      RETURN 'completed';
    ELSE
      RETURN 'approved';
    END IF;
  END IF;
  
  -- Handle in_progress status
  IF raw_status = 'in_progress' THEN
    RETURN 'in_progress';
  END IF;
  
  -- Handle completed status
  IF raw_status = 'completed' THEN
    RETURN 'completed';
  END IF;
  
  -- Handle pending with approval status
  IF raw_status = 'pending' THEN
    IF approval_status IS NULL THEN
      RETURN 'pending';
    ELSIF approval_status = 'approved' THEN
      RETURN 'approved';
    ELSIF approval_status = 'rejected' THEN
      RETURN 'cancelled';
    ELSE
      RETURN 'pending';
    END IF;
  END IF;
  
  -- Default fallback
  RETURN 'pending';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to get status display information
CREATE OR REPLACE FUNCTION public.get_status_display_info(status TEXT)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to get payment status display information
CREATE OR REPLACE FUNCTION public.get_payment_status_display_info(payment_status TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE payment_status
    WHEN 'paid' THEN jsonb_build_object(
      'label', 'Paid',
      'color', 'green',
      'icon', 'check-circle',
      'description', 'Payment has been received'
    )
    WHEN 'pending' THEN jsonb_build_object(
      'label', 'Pending Payment',
      'color', 'amber',
      'icon', 'clock',
      'description', 'Awaiting payment'
    )
    WHEN 'invoiced' THEN jsonb_build_object(
      'label', 'Invoiced',
      'color', 'blue',
      'icon', 'file-text',
      'description', 'Invoice has been sent'
    )
    WHEN 'no_invoice' THEN jsonb_build_object(
      'label', 'No Invoice',
      'color', 'gray',
      'icon', 'minus',
      'description', 'No invoice created yet'
    )
    ELSE jsonb_build_object(
      'label', 'Unknown',
      'color', 'gray',
      'icon', 'help-circle',
      'description', 'Payment status not recognized'
    )
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comments for documentation
COMMENT ON FUNCTION public.standardize_booking_status IS 'Standardizes booking statuses to a consistent set of values';
COMMENT ON FUNCTION public.get_status_display_info IS 'Returns display information for booking statuses (label, color, icon, description)';
COMMENT ON FUNCTION public.get_payment_status_display_info IS 'Returns display information for payment statuses (label, color, icon, description)';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.standardize_booking_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_status_display_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_status_display_info TO authenticated;
