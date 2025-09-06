-- Fix booking status change trigger to handle errors gracefully
-- This prevents the trigger from failing the entire booking update

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS booking_status_change_trigger ON public.bookings;
DROP FUNCTION IF EXISTS validate_booking_status_transition();

-- Create a more robust function that handles errors gracefully
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the status change for audit purposes (with error handling)
  BEGIN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      created_at
    ) VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'status_change',
      'bookings',
      NEW.id::text,
      jsonb_build_object('status', OLD.status, 'approval_status', OLD.approval_status),
      jsonb_build_object('status', NEW.status, 'approval_status', NEW.approval_status),
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the trigger
      RAISE WARNING 'Failed to log booking status change: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER booking_status_change_trigger
  AFTER UPDATE OF status, approval_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_booking_status_transition() TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION validate_booking_status_transition() IS 'Logs booking status changes with error handling to prevent update failures';
