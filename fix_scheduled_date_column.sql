-- Quick fix for missing scheduled_date column in booking views
-- Run this if you get "column v_booking_status.scheduled_date does not exist"

-- Drop and recreate v_booking_status view with scheduled_date
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status AS
SELECT
  b.id,
  b.booking_number,
  b.title as booking_title,
  b.service_id,
  s.title AS service_title,
  s.description as service_description,
  s.category as service_category,
  b.client_id,
  cp.full_name AS client_name,
  cp.email as client_email,
  cp.phone as client_phone,
  cp.company_name as client_company,
  cp.avatar_url as client_avatar,
  b.provider_id,
  pp.full_name AS provider_name,
  pp.email as provider_email,
  pp.phone as provider_phone,
  pp.company_name as provider_company,
  pp.avatar_url as provider_avatar,
  
  -- Progress calculation
  COALESCE(b.project_progress, 0) AS progress,
  
  -- Milestone counts (simplified for now)
  0 as total_milestones,
  0 as completed_milestones,
  
  b.status AS raw_status,
  b.approval_status,
  
  -- Status mapping
  CASE
    WHEN b.status = 'draft' THEN 'not_started'
    WHEN b.status = 'pending_payment' THEN 'pending_review'
    WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'
    WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'
    WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'
    WHEN b.status = 'cancelled' THEN 'cancelled'
    WHEN b.status = 'disputed' THEN 'disputed'
    ELSE 'pending'
  END as display_status,
  
  -- Payment information
  b.payment_status,
  CASE 
    WHEN b.payment_status = 'paid' THEN 'paid'
    WHEN b.payment_status = 'pending' THEN 'pending'
    WHEN b.payment_status = 'failed' THEN 'failed'
    WHEN b.payment_status = 'refunded' THEN 'refunded'
    ELSE 'unknown'
  END as payment_display_status,
  
  NULL::uuid as invoice_id,
  NULL::text as invoice_status,
  
  -- Amount information
  b.amount_cents,
  b.total_amount as amount,
  b.currency,
  
  -- Timestamps (including scheduled_date)
  b.created_at,
  b.updated_at,
  b.due_at,
  b.scheduled_date,
  b.requirements,
  b.notes
  
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles cp ON b.client_id = cp.id
LEFT JOIN public.profiles pp ON b.provider_id = pp.id;

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated;
GRANT SELECT ON public.v_booking_status TO service_role;

-- Test the view
SELECT '✅ v_booking_status view fixed with scheduled_date column!' as status;
SELECT COUNT(*) as total_bookings FROM public.v_booking_status;
