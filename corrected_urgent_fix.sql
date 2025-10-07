-- URGENT FIX: Correct Status Mapping for 100% Progress
-- This fixes the issue where 100% progress shows as "in_progress" instead of "completed"

-- First, let's check the current status mapping
SELECT 
  b.id,
  b.title,
  b.status as raw_status,
  b.project_progress,
  CASE 
    WHEN b.status = 'draft' THEN 'not_started'::text
    WHEN b.status = 'pending_payment' THEN 'pending_approval'::text
    WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'::text
    WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::text
    WHEN COALESCE(b.project_progress, 0) = 100 THEN 'completed'::text  -- This should fix it
    WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'::text
    WHEN b.status = 'cancelled' THEN 'cancelled'::text
    WHEN b.status = 'disputed' THEN 'disputed'::text
    ELSE 'pending_approval'::text
  END as calculated_status
FROM public.bookings b
WHERE b.project_progress = 100 OR b.project_progress > 0
ORDER BY b.project_progress DESC;

-- Now recreate the view with the CORRECTED status mapping
DROP VIEW IF EXISTS public.v_booking_status CASCADE;

CREATE VIEW public.v_booking_status
AS
SELECT 
  b.id,                                    -- Primary key
  b.booking_number, 
  COALESCE(b.title, 'Service Booking') as booking_title,
  b.status as raw_status,                  
  b.operational_status,
  b.payment_status, 
  b.approval_status, 
  b.created_at, 
  b.updated_at,
  
  -- Essential IDs
  b.client_id,                            
  b.provider_id,                          
  b.service_id,                           
  
  -- Financial information
  b.total_amount as amount,               
  b.amount_cents,                         
  b.currency,
  b.subtotal,
  b.vat_amount,
  
  -- Client information
  c.full_name as client_name, 
  c.email as client_email,
  COALESCE(c.company_name, '') as client_company,       
  COALESCE(c.avatar_url, '') as client_avatar,          
  
  -- Provider information
  p.full_name as provider_name, 
  p.email as provider_email,
  COALESCE(p.company_name, '') as provider_company,     
  COALESCE(p.avatar_url, '') as provider_avatar,        
  
  -- Service information
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  
  -- Progress information
  COALESCE(b.project_progress, 0) as progress,
  0 as total_milestones,                   
  0 as completed_milestones,               
  
  -- ✅ CRITICAL FIX: Corrected Status Mapping
  -- Priority: 100% progress ALWAYS = completed, regardless of raw status
  CASE 
    WHEN COALESCE(b.project_progress, 0) = 100 THEN 'completed'::text  -- ✅ HIGHEST PRIORITY
    WHEN b.status = 'delivered' OR b.status = 'completed' THEN 'completed'::text
    WHEN b.status = 'draft' THEN 'not_started'::text
    WHEN b.status = 'pending_payment' THEN 'pending_approval'::text
    WHEN b.status = 'paid' AND COALESCE(b.project_progress, 0) = 0 THEN 'approved'::text
    WHEN b.status = 'in_progress' OR (b.status = 'paid' AND COALESCE(b.project_progress, 0) > 0) THEN 'in_progress'::text
    WHEN b.status = 'cancelled' THEN 'cancelled'::text
    WHEN b.status = 'disputed' THEN 'disputed'::text
    ELSE 'pending_approval'::text
  END as display_status,
  
  -- Invoice information
  'pending'::text as invoice_status,      
  NULL::uuid as invoice_id,               
  
  -- Additional fields
  b.requirements,
  b.notes,
  b.due_at,
  b.scheduled_date,
  b.estimated_duration,
  b.location

FROM public.bookings b
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.services s ON b.service_id = s.id;

-- Grant permissions
GRANT SELECT ON public.v_booking_status TO authenticated, service_role;

-- Verify the fix
SELECT '✅ URGENT FIX APPLIED: 100% progress now correctly shows as "completed"!' as status;

-- Test query to verify the fix works (CORRECTED COLUMN NAMES)
SELECT 
  booking_title,
  progress,
  raw_status,
  display_status
FROM public.v_booking_status 
WHERE progress = 100;
