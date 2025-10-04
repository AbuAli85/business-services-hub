-- Create comprehensive bookings view with all related data
-- This view joins bookings with services, clients, providers, invoices, and milestones

CREATE OR REPLACE VIEW bookings_full_view AS
SELECT 
  -- Booking core data
  b.id,
  b.title,
  b.description,
  b.status,
  b.approval_status,
  b.created_at,
  b.updated_at,
  b.scheduled_date,
  b.scheduled_time,
  b.location,
  b.notes,
  b.amount,
  b.amount_cents,
  b.currency,
  b.client_id,
  b.provider_id,
  b.service_id,
  b.service_package_id,
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
    COUNT(*) as total_milestones,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_milestones,
    COALESCE(SUM(jsonb_array_length(COALESCE(tasks, '[]'::jsonb))), 0) as total_tasks,
    COALESCE(SUM(
      jsonb_array_length(
        COALESCE(tasks, '[]'::jsonb) 
        FILTER (WHERE jsonb_path_exists(tasks, '$[*] ? (@.status == "completed")'))
      )
    ), 0) as completed_tasks
  FROM milestones 
  WHERE booking_id = b.id
) ms ON true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_full_view_client_id ON bookings_full_view(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_full_view_provider_id ON bookings_full_view(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_full_view_service_id ON bookings_full_view(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_full_view_status ON bookings_full_view(normalized_status);
CREATE INDEX IF NOT EXISTS idx_bookings_full_view_created_at ON bookings_full_view(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_full_view_invoice_status ON bookings_full_view(invoice_status);

-- Grant permissions
GRANT SELECT ON bookings_full_view TO authenticated;
GRANT SELECT ON bookings_full_view TO anon;
