-- Migration: Create booking_enriched view and related views
-- Description: Replace denormalized columns with proper joins
-- Date: 2025-01-25

-- 1. Create booking_enriched view with all necessary joins
CREATE OR REPLACE VIEW public.booking_enriched AS
SELECT 
  b.id,
  b.booking_number,
  b.requirements,
  b.status,
  b.approval_status,
  b.subtotal,
  b.vat_percent,
  b.vat_amount,
  b.total_amount,
  b.currency,
  b.amount_cents,
  b.due_at,
  b.scheduled_date,
  b.created_at,
  b.updated_at,
  
  -- Service information
  s.id as service_id,
  s.title as service_title,
  s.description as service_description,
  s.category as service_category,
  s.status as service_status,
  s.base_price as service_base_price,
  s.currency as service_currency,
  s.cover_image_url as service_cover_image_url,
  s.featured as service_featured,
  
  -- Client information
  c.id as client_id,
  c.full_name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  c.country as client_country,
  c.is_verified as client_verified,
  
  -- Provider information
  p.id as provider_id,
  p.full_name as provider_name,
  p.email as provider_email,
  p.phone as provider_phone,
  p.country as provider_country,
  p.is_verified as provider_verified,
  
  -- Company information (provider's company)
  comp.id as company_id,
  comp.name as company_name,
  comp.cr_number as company_cr_number,
  comp.vat_number as company_vat_number,
  comp.logo_url as company_logo_url,
  
  -- Package information
  sp.id as package_id,
  sp.name as package_name,
  sp.price as package_price,
  sp.delivery_days as package_delivery_days,
  sp.revisions as package_revisions,
  sp.features as package_features,
  
  -- Invoice information
  i.id as invoice_id,
  i.amount as invoice_amount,
  i.currency as invoice_currency,
  i.status as invoice_status,
  i.invoice_number,
  i.pdf_url as invoice_pdf_url,
  i.created_at as invoice_created_at,
  
  -- Review information
  r.id as review_id,
  r.rating as review_rating,
  r.comment as review_comment,
  r.created_at as review_created_at

FROM public.bookings b
LEFT JOIN public.services s ON b.service_id = s.id
LEFT JOIN public.profiles c ON b.client_id = c.id
LEFT JOIN public.profiles p ON b.provider_id = p.id
LEFT JOIN public.companies comp ON p.company_id = comp.id
LEFT JOIN public.service_packages sp ON b.package_id = sp.id
LEFT JOIN public.invoices i ON b.id = i.booking_id
LEFT JOIN public.reviews r ON b.id = r.booking_id;

-- 2. Create RLS policies for booking_enriched view
-- Note: Views inherit RLS from underlying tables, but we need to ensure proper access

-- 3. Create service_enriched view
CREATE OR REPLACE VIEW public.service_enriched AS
SELECT 
  s.id,
  s.title,
  s.description,
  s.category,
  s.status,
  s.base_price,
  s.currency,
  s.cover_image_url,
  s.featured,
  s.created_at,
  s.updated_at,
  
  -- Provider information
  p.id as provider_id,
  p.full_name as provider_name,
  p.email as provider_email,
  p.phone as provider_phone,
  p.country as provider_country,
  p.is_verified as provider_verified,
  
  -- Company information
  comp.id as company_id,
  comp.name as company_name,
  comp.cr_number as company_cr_number,
  comp.vat_number as company_vat_number,
  comp.logo_url as company_logo_url,
  
  -- Service statistics
  COALESCE(booking_stats.booking_count, 0) as booking_count,
  COALESCE(booking_stats.total_revenue, 0) as total_revenue,
  COALESCE(review_stats.avg_rating, 0) as avg_rating,
  COALESCE(review_stats.review_count, 0) as review_count

FROM public.services s
LEFT JOIN public.profiles p ON s.provider_id = p.id
LEFT JOIN public.companies comp ON p.company_id = comp.id
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) as booking_count,
    SUM(COALESCE(b.total_amount, 0)) as total_revenue
  FROM public.bookings b
  WHERE b.service_id = s.id
) booking_stats ON true
LEFT JOIN LATERAL (
  SELECT 
    AVG(r.rating) as avg_rating,
    COUNT(*) as review_count
  FROM public.reviews r
  JOIN public.bookings b ON r.booking_id = b.id
  WHERE b.service_id = s.id
) review_stats ON true;

-- 4. Create user_enriched view
CREATE OR REPLACE VIEW public.user_enriched AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.country,
  p.company_id,
  p.is_verified,
  p.created_at,
  p.updated_at,
  
  -- Company information
  comp.name as company_name,
  comp.cr_number as company_cr_number,
  comp.vat_number as company_vat_number,
  comp.logo_url as company_logo_url,
  
  -- Role information
  COALESCE(ur.role_name, 'client') as primary_role,
  ur.role_display_name as primary_role_display_name,
  ur.role_active as role_active,
  ur.role_assigned_at as role_assigned_at,
  
  -- All roles
  COALESCE(
    json_agg(
      json_build_object(
        'name', r.name,
        'display_name', r.display_name,
        'is_active', ur_all.is_active,
        'assigned_at', ur_all.assigned_at
      ) ORDER BY ur_all.assigned_at DESC
    ) FILTER (WHERE r.id IS NOT NULL),
    '[]'::json
  ) as all_roles,
  
  -- User statistics
  COALESCE(client_stats.booking_count, 0) as client_booking_count,
  COALESCE(provider_stats.service_count, 0) as provider_service_count,
  COALESCE(provider_stats.booking_count, 0) as provider_booking_count,
  COALESCE(provider_stats.total_revenue, 0) as provider_total_revenue

FROM public.profiles p
LEFT JOIN public.companies comp ON p.company_id = comp.id
LEFT JOIN LATERAL (
  SELECT r.name as role_name, r.display_name as role_display_name, ur.is_active as role_active, ur.assigned_at as role_assigned_at
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = p.id AND ur.is_active = true
  ORDER BY ur.assigned_at DESC
  LIMIT 1
) ur ON true
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) as booking_count
  FROM public.bookings b
  WHERE b.client_id = p.id
) client_stats ON true
LEFT JOIN LATERAL (
  SELECT 
    COUNT(DISTINCT s.id) as service_count,
    COUNT(b.id) as booking_count,
    SUM(COALESCE(b.total_amount, 0)) as total_revenue
  FROM public.services s
  LEFT JOIN public.bookings b ON s.id = b.service_id
  WHERE s.provider_id = p.id
) provider_stats ON true
LEFT JOIN public.user_roles ur_all ON ur_all.user_id = p.id
LEFT JOIN public.roles r ON ur_all.role_id = r.id
GROUP BY p.id, p.email, p.full_name, p.phone, p.country, p.company_id, p.is_verified, p.created_at, p.updated_at,
         comp.name, comp.cr_number, comp.vat_number, comp.logo_url,
         ur.role_name, ur.role_display_name, ur.role_active, ur.role_assigned_at,
         client_stats.booking_count, provider_stats.service_count, provider_stats.booking_count, provider_stats.total_revenue;

-- 5. Create RPC functions for common queries
CREATE OR REPLACE FUNCTION public.get_bookings_for_user(
  user_uuid UUID,
  user_role TEXT,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  booking_number TEXT,
  service_title TEXT,
  client_name TEXT,
  provider_name TEXT,
  status TEXT,
  total_amount NUMERIC,
  currency TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    be.id,
    be.booking_number,
    be.service_title,
    be.client_name,
    be.provider_name,
    be.status,
    be.total_amount,
    be.currency,
    be.created_at
  FROM public.booking_enriched be
  WHERE 
    CASE 
      WHEN user_role = 'admin' THEN true
      WHEN user_role = 'provider' THEN be.provider_id = user_uuid
      WHEN user_role = 'client' THEN be.client_id = user_uuid
      ELSE false
    END
  ORDER BY be.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

CREATE OR REPLACE FUNCTION public.get_services_for_user(
  user_uuid UUID,
  user_role TEXT,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  base_price NUMERIC,
  currency TEXT,
  provider_name TEXT,
  booking_count BIGINT,
  avg_rating NUMERIC,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    se.id,
    se.title,
    se.category,
    se.base_price,
    se.currency,
    se.provider_name,
    se.booking_count,
    se.avg_rating,
    se.created_at
  FROM public.service_enriched se
  WHERE 
    CASE 
      WHEN user_role = 'admin' THEN true
      WHEN user_role = 'provider' THEN se.provider_id = user_uuid
      WHEN user_role = 'client' THEN se.status = 'active'
      ELSE false
    END
  ORDER BY se.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
$$;

-- 6. Grant permissions
GRANT SELECT ON public.booking_enriched TO authenticated;
GRANT SELECT ON public.service_enriched TO authenticated;
GRANT SELECT ON public.user_enriched TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bookings_for_user(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_services_for_user(UUID, TEXT, INTEGER, INTEGER) TO authenticated;
