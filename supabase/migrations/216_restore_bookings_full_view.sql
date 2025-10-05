-- Migration: Restore bookings_full_view for backward compatibility
-- Date: January 2025
-- Description: Recreate the bookings_full_view that was removed in migration 203
-- This is needed because some frontend components are still referencing it

-- Create comprehensive bookings view with all related data
-- This view joins bookings with services, clients, providers, invoices, and milestones
CREATE OR REPLACE VIEW bookings_full_view AS
SELECT 
  -- Booking core data
  b.id,
  b.title,
  b.requirements,
  b.status,
  b.created_at,
  b.updated_at,
  b.due_at,
  b.subtotal,
  b.vat_percent,
  b.vat_amount,
  b.total_amount,
  b.currency,
  b.client_id,
  b.provider_id,
  b.service_id,
  b.package_id,
  b.progress_percentage,
  
  -- Service information
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  s.base_price as service_base_price,
  s.status as service_status,
  
  -- Client profile information
  cp.id as client_profile_id,
  cp.full_name as client_name,
  cp.email as client_email,
  cp.phone as client_phone,
  cp.company_name as client_company,
  cp.avatar_url as client_avatar,
  
  -- Provider profile information
  pp.id as provider_profile_id,
  pp.full_name as provider_name,
  pp.email as provider_email,
  pp.phone as provider_phone,
  pp.company_name as provider_company,
  pp.avatar_url as provider_avatar,
  
  -- Invoice information (latest invoice)
  i.id as invoice_id,
  i.status as invoice_status,
  i.amount as invoice_amount,
  i.currency as invoice_currency,
  i.invoice_number,
  i.due_date as invoice_due_date,
  i.paid_at,
  i.created_at as invoice_created_at,
  
  -- Milestone statistics
  COALESCE(ms.total_milestones, 0) as total_milestones,
  COALESCE(ms.completed_milestones, 0) as completed_milestones,
  COALESCE(ms.total_tasks, 0) as total_tasks,
  COALESCE(ms.completed_tasks, 0) as completed_tasks,
  
  -- Calculated progress percentage
  CASE 
    WHEN COALESCE(ms.total_milestones, 0) > 0 
    THEN ROUND((COALESCE(ms.completed_milestones, 0)::numeric / ms.total_milestones::numeric) * 100)
    ELSE COALESCE(b.progress_percentage, 0)
  END as calculated_progress_percentage,
  
  -- Payment status derivation
  CASE 
    WHEN i.status = 'paid' THEN 'paid'
    WHEN i.status = 'issued' THEN 'pending'
    WHEN i.id IS NOT NULL THEN 'invoiced'
    ELSE 'no_invoice'
  END as payment_status,
  
  -- Status normalization
  CASE 
    WHEN b.status IS NOT NULL THEN b.status
    WHEN b.approval_status IS NOT NULL THEN b.approval_status
    ELSE 'pending'
  END as normalized_status

FROM bookings b
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN profiles cp ON b.client_id = cp.id
LEFT JOIN profiles pp ON b.provider_id = pp.id
LEFT JOIN LATERAL (
  -- Get the latest invoice for this booking
  SELECT * FROM invoices 
  WHERE booking_id = b.id 
  ORDER BY created_at DESC 
  LIMIT 1
) i ON true
LEFT JOIN LATERAL (
  -- Get milestone statistics for this booking
  SELECT 
    COUNT(DISTINCT m.id) as total_milestones,
    COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'completed') as completed_milestones,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
  FROM milestones m
  LEFT JOIN tasks t ON t.milestone_id = m.id
  WHERE m.booking_id = b.id
) ms ON true;

-- Grant permissions
GRANT SELECT ON bookings_full_view TO authenticated;
GRANT SELECT ON bookings_full_view TO anon;

-- Add comment for documentation
COMMENT ON VIEW bookings_full_view IS 'Legacy view restored for backward compatibility. Consider migrating to v_booking_status for better performance.';

-- Verify the view was created successfully
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'bookings_full_view'
    ) THEN
        RAISE EXCEPTION 'bookings_full_view was not created successfully!';
    END IF;
    
    RAISE NOTICE 'bookings_full_view restored successfully for backward compatibility.';
END $$;
