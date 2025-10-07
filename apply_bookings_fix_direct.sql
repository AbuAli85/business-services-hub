-- DIRECT SQL FIX FOR BOOKINGS PAGE
-- Apply this directly in Supabase SQL Editor

-- 1. Fix the v_booking_status view with proper status mapping
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status AS
SELECT 
  b.id, 
  b.booking_number,
  COALESCE(b.title, 'Service Booking') as booking_title,
  b.status as raw_status, 
  b.operational_status, 
  b.payment_status, 
  b.approval_status, 
  b.created_at, 
  b.updated_at, 
  b.client_id, 
  b.provider_id, 
  b.service_id,
  b.total_amount as amount, 
  b.amount_cents, 
  b.currency, 
  b.subtotal, 
  b.vat_amount,
  c.full_name as client_name, 
  c.email as client_email,
  COALESCE(c.company_name, '') as client_company, 
  COALESCE(c.avatar_url, '') as client_avatar,
  p.full_name as provider_name, 
  p.email as provider_email,
  COALESCE(p.company_name, '') as provider_company, 
  COALESCE(p.avatar_url, '') as provider_avatar,
  s.title as service_title, 
  s.description as service_description, 
  s.category as service_category,
  COALESCE(b.project_progress, 0) as progress,
  
  -- Calculate milestone counts dynamically
  COALESCE(milestone_stats.total_milestones, 0) as total_milestones,
  COALESCE(milestone_stats.completed_milestones, 0) as completed_milestones,
  
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
  
  -- Enhanced payment status
  CASE 
    WHEN b.payment_status = 'paid' THEN 'paid'::text
    WHEN b.payment_status = 'pending' THEN 'pending'::text
    WHEN b.payment_status = 'failed' THEN 'failed'::text
    WHEN b.payment_status = 'refunded' THEN 'refunded'::text
    ELSE COALESCE(b.payment_status, 'pending')::text
  END as invoice_status,
  
  NULL::uuid as invoice_id,
  b.requirements, 
  b.notes, 
  b.due_at, 
  b.scheduled_date, 
  b.estimated_duration, 
  b.location

FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN (
  SELECT 
    booking_id,
    COUNT(*) as total_milestones,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_milestones
  FROM public.milestones
  GROUP BY booking_id
) milestone_stats ON b.id = milestone_stats.booking_id;

-- 2. Create optimized booking list view for better performance
DROP VIEW IF EXISTS public.booking_list_optimized CASCADE;

CREATE VIEW public.booking_list_optimized AS
SELECT 
  b.id,
  b.booking_number,
  COALESCE(b.title, 'Service Booking') as booking_title,
  b.status,
  b.approval_status,
  b.payment_status,
  b.operational_status,
  b.total_amount,
  b.amount_cents,
  b.currency,
  b.project_progress,
  b.created_at,
  b.updated_at,
  b.due_at,
  b.scheduled_date,
  b.client_id,
  b.provider_id,
  b.service_id,
  
  -- Client info
  c.full_name as client_name,
  c.email as client_email,
  c.company_name as client_company,
  
  -- Provider info  
  p.full_name as provider_name,
  p.email as provider_email,
  p.company_name as provider_company,
  
  -- Service info
  s.title as service_title,
  s.category as service_category,
  
  -- Enhanced status with 100% progress priority
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
  
  -- Progress calculation
  COALESCE(b.project_progress, 0) as progress_percentage,
  
  -- Payment status enhancement
  CASE 
    WHEN b.payment_status = 'paid' THEN 'paid'::text
    WHEN b.payment_status = 'pending' THEN 'pending'::text
    WHEN b.payment_status = 'failed' THEN 'failed'::text
    WHEN b.payment_status = 'refunded' THEN 'refunded'::text
    ELSE COALESCE(b.payment_status, 'pending')::text
  END as payment_display_status

FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- 3. Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated, service_role;
GRANT SELECT ON public.booking_list_optimized TO authenticated, service_role;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_progress ON public.bookings(project_progress);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_at ON public.bookings(updated_at);

-- 5. Test the views
SELECT 'Testing v_booking_status view:' as test_type;
SELECT 
  booking_title,
  progress,
  raw_status,
  display_status,
  payment_status,
  invoice_status
FROM public.v_booking_status 
WHERE progress = 100
LIMIT 5;

SELECT 'Testing booking_list_optimized view:' as test_type;
SELECT 
  booking_title,
  progress_percentage,
  status,
  display_status,
  payment_status,
  payment_display_status
FROM public.booking_list_optimized 
WHERE progress_percentage = 100
LIMIT 5;
