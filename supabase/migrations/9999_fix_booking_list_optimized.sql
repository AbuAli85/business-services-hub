-- Recreate booking_list_optimized view with SECURITY INVOKER
-- Note: This view was separated from the main migration due to complexity

DROP VIEW IF EXISTS public.booking_list_optimized CASCADE;

CREATE VIEW public.booking_list_optimized
WITH (security_invoker = true)
AS
SELECT 
  b.id,
  b.title,
  b.status,
  b.created_at,
  b.updated_at,
  b.scheduled_date,
  b.due_at,
  b.total_amount as amount,
  b.currency,
  b.project_progress,
  b.client_id,
  b.provider_id,
  b.service_id,
  b.package_id,
  
  -- Service information
  s.title as service_title,
  s.category as service_category,
  
  -- Client information
  c.full_name as client_name,
  c.email as client_email,
  c.company_name as client_company,
  
  -- Provider information
  p.full_name as provider_name,
  p.email as provider_email,
  p.company_name as provider_company
  
FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id;

-- Grant permissions
GRANT SELECT ON public.booking_list_optimized TO authenticated;

-- Add comment
COMMENT ON VIEW public.booking_list_optimized IS 'Optimized booking list - SECURITY INVOKER (RLS enforced)';
