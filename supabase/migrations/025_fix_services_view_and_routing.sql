-- Migration: Fix services view and routing issues
-- This migration corrects the public_services view to match the actual table structure
-- and ensures proper access to individual service pages

-- 1. Fix the public_services view to match actual table structure
DROP VIEW IF EXISTS public_services;

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
    s.status,
    s.provider_id,
    p.full_name as provider_name,
    c.name as company_name,
    c.logo_url as company_logo
FROM public.services s
JOIN public.profiles p ON s.provider_id = p.id
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE s.status = 'active'; -- Only filter by status since that's what exists

-- 2. Grant permissions on the corrected view
GRANT SELECT ON public_services TO authenticated;
GRANT SELECT ON public_services TO anon;

-- 3. Ensure RLS policies allow viewing of active services
-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Clients can view approved services" ON public.services;

-- Create a simple policy that allows viewing active services
CREATE POLICY "Anyone can view active services" ON public.services
    FOR SELECT USING (status = 'active');

-- 4. Ensure the services table has proper RLS enabled
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions for the service role
GRANT ALL ON public.services TO service_role;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;

-- 6. Create an index on services.id for better performance
CREATE INDEX IF NOT EXISTS idx_services_id ON public.services(id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);

-- 7. Add comments for documentation
COMMENT ON VIEW public_services IS 'Public view of active services for clients with correct table structure';
COMMENT ON TABLE public.services IS 'Services offered by providers with proper access controls';

-- 8. Final verification
DO $$
BEGIN
    RAISE NOTICE 'Migration 025_fix_services_view_and_routing completed successfully';
    RAISE NOTICE 'Public services view corrected to match actual table structure';
    RAISE NOTICE 'RLS policies updated to allow viewing of active services';
    RAISE NOTICE 'Service role permissions granted for proper access';
    RAISE NOTICE 'Performance indexes added for better query performance';
END $$;
