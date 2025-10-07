-- Quick Fix for v_booking_status View
-- Run this in Supabase SQL Editor to fix the immediate application error

-- Drop and recreate the view with the missing columns
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status
AS
SELECT 
  b.id,                                    -- Primary key (app expects 'id')
  b.booking_number, 
  COALESCE(b.title, 'Service Booking') as booking_title,  -- App expects 'booking_title'
  b.status as raw_status,                  -- App expects 'raw_status'
  b.operational_status,
  b.payment_status, 
  b.approval_status, 
  b.created_at, 
  b.updated_at,
  
  -- Essential IDs that the application needs
  b.client_id,                            -- Required for filtering
  b.provider_id,                          -- Required for filtering  
  b.service_id,                           -- Required for joins
  
  -- Financial information
  b.total_amount as amount,               -- App expects 'amount'
  b.amount_cents,                         -- App expects 'amount_cents'
  b.currency,
  b.subtotal,
  b.vat_amount,
  
  -- Client information
  c.full_name as client_name, 
  c.email as client_email,
  COALESCE(c.company_name, '') as client_company,       -- App expects 'client_company'
  COALESCE(c.avatar_url, '') as client_avatar,          -- App expects 'client_avatar'
  
  -- Provider information
  p.full_name as provider_name, 
  p.email as provider_email,
  COALESCE(p.company_name, '') as provider_company,     -- App expects 'provider_company'
  COALESCE(p.avatar_url, '') as provider_avatar,        -- App expects 'provider_avatar'
  
  -- Service information
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  
  -- Progress and milestone information (calculated)
  COALESCE(b.project_progress, 0) as progress,
  COALESCE(milestone_stats.total_milestones, 0) as total_milestones,
  COALESCE(milestone_stats.completed_milestones, 0) as completed_milestones,
  
  -- Status mapping for UI
  CASE 
    WHEN b.status = 'draft' THEN 'not_started'::text
    WHEN b.status = 'pending_payment' THEN 'pending_approval'::text
    WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'::text
    WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'::text
    WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::text
    WHEN b.status = 'cancelled' THEN 'cancelled'::text
    WHEN b.status = 'disputed' THEN 'disputed'::text
    ELSE 'pending_approval'::text
  END as display_status,
  
  -- Invoice information (placeholder - may need to be joined from actual invoice table)
  'pending'::text as invoice_status,      -- App expects 'invoice_status'
  NULL::uuid as invoice_id,               -- App expects 'invoice_id'
  
  -- Additional useful fields
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

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated, service_role;

-- Success message
SELECT '✅ v_booking_status view fixed with all required columns!' as status;
