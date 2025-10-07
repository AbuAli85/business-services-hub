-- CRITICAL FIX: Make 100% progress = completed status
-- Run this immediately to fix the highlighted issue in the screenshot

DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status
AS
SELECT 
  b.id, b.booking_number, 
  COALESCE(b.title, 'Service Booking') as booking_title,
  b.status as raw_status, b.operational_status, b.payment_status, b.approval_status, 
  b.created_at, b.updated_at, b.client_id, b.provider_id, b.service_id,
  b.total_amount as amount, b.amount_cents, b.currency, b.subtotal, b.vat_amount,
  c.full_name as client_name, c.email as client_email,
  COALESCE(c.company_name, '') as client_company, COALESCE(c.avatar_url, '') as client_avatar,
  p.full_name as provider_name, p.email as provider_email,
  COALESCE(p.company_name, '') as provider_company, COALESCE(p.avatar_url, '') as provider_avatar,
  s.title as service_title, s.description as service_description, s.category as service_category,
  COALESCE(b.project_progress, 0) as progress,
  0 as total_milestones, 0 as completed_milestones,
  
  -- ✅ CRITICAL FIX: 100% progress = completed (HIGHEST PRIORITY)
  CASE 
    WHEN COALESCE(b.project_progress, 0) = 100 THEN 'completed'::text
    WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::text
    WHEN b.status = 'draft' THEN 'not_started'::text
    WHEN b.status = 'pending_payment' THEN 'pending_approval'::text
    WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'::text
    WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'::text
    WHEN b.status = 'cancelled' THEN 'cancelled'::text
    WHEN b.status = 'disputed' THEN 'disputed'::text
    ELSE 'pending_approval'::text
  END as display_status,
  
  'pending'::text as invoice_status, NULL::uuid as invoice_id,
  b.requirements, b.notes, b.due_at, b.scheduled_date, b.estimated_duration, b.location

FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

GRANT SELECT ON public.v_booking_status TO authenticated, service_role;

SELECT '✅ CRITICAL FIX APPLIED: Content Creation with 100% progress will now show as "completed"!' as status;
