-- Fix public_services view to match correct table structure
-- This migration corrects the view to properly join profiles and companies tables

-- Drop the existing view
DROP VIEW IF EXISTS public_services;

-- Recreate the view with correct structure
CREATE OR REPLACE VIEW public_services AS
SELECT 
    s.id,
    s.title,
    s.description,
    s.category,
    s.base_price,
    s.currency,
    s.cover_image_url,
    s.created_at,
    COALESCE(s.views_count, 0) as views_count,
    COALESCE(s.bookings_count, 0) as bookings_count,
    COALESCE(s.rating, 0) as rating,
    s.tags,
    s.provider_id,
    p.full_name as provider_name,
    c.name as company_name,
    c.name as company_display_name,
    c.logo_url as company_logo
FROM public.services s
JOIN public.profiles p ON s.provider_id = p.id
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE s.approval_status = 'approved' 
  AND s.status = 'active'
  AND s.is_verified = true;

-- Grant permissions
GRANT SELECT ON public_services TO authenticated;

-- Add comment
COMMENT ON VIEW public_services IS 'Public view of approved and active services for clients with correct table joins';
