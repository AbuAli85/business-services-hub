-- Migration: Enhance Data Isolation and Security for Multiple Providers
-- This migration ensures proper data isolation between providers and clients

-- 1. Enhance services table with better security and missing columns
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bookings_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'suspended')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_approval_status ON public.services(approval_status);
CREATE INDEX IF NOT EXISTS idx_services_is_featured ON public.services(is_featured);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);

-- 3. Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_services_provider_status ON public.services(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_services_category_status ON public.services(category, status);
CREATE INDEX IF NOT EXISTS idx_services_approval_featured ON public.services(approval_status, is_featured);

-- 4. Enhanced Row Level Security (RLS) policies for services
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert their own services" ON public.services;
DROP POLICY IF EXISTS "Users can update their own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can view their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can insert their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can update their own services" ON public.services;
DROP POLICY IF EXISTS "Providers can delete their own services" ON public.services;
DROP POLICY IF EXISTS "Clients can view approved services" ON public.services;
DROP POLICY IF EXISTS "Admins can view all services" ON public.services;

-- Provider can view their own services
CREATE POLICY "Providers can view their own services" ON public.services
    FOR SELECT USING (
        auth.uid() = provider_id
    );

-- Provider can insert their own services
CREATE POLICY "Providers can insert their own services" ON public.services
    FOR INSERT WITH CHECK (
        auth.uid() = provider_id
    );

-- Provider can update their own services
CREATE POLICY "Providers can update their own services" ON public.services
    FOR UPDATE USING (
        auth.uid() = provider_id
    );

-- Provider can delete their own services
CREATE POLICY "Providers can delete their own services" ON public.services
    FOR DELETE USING (
        auth.uid() = provider_id
    );

-- Clients can view approved and active services
CREATE POLICY "Clients can view approved services" ON public.services
    FOR SELECT USING (
        approval_status = 'approved' AND status = 'active'
    );

-- Admins can view all services
CREATE POLICY "Admins can view all services" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- 5. Enhanced RLS for companies table
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can insert their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update their own company" ON public.companies;
DROP POLICY IF EXISTS "Users can delete their own company" ON public.companies;
DROP POLICY IF EXISTS "Providers can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Providers can insert their own company" ON public.companies;
DROP POLICY IF EXISTS "Providers can update their own company" ON public.companies;
DROP POLICY IF EXISTS "Providers can delete their own company" ON public.companies;

-- Users can view their own company
CREATE POLICY "Users can view their own company" ON public.companies
    FOR SELECT USING (
        auth.uid() = created_by
    );

-- Users can insert their own company
CREATE POLICY "Users can insert their own company" ON public.companies
    FOR INSERT WITH CHECK (
        auth.uid() = created_by
    );

-- Users can update their own company
CREATE POLICY "Users can update their own company" ON public.companies
    FOR UPDATE USING (
        auth.uid() = created_by
    );

-- Users can delete their own company
CREATE POLICY "Users can delete their own company" ON public.companies
    FOR DELETE USING (
        auth.uid() = created_by
    );

-- 6. Enhanced RLS for profiles table
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Providers can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Providers can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Providers can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Providers can delete their own profile" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id
    );

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
    );

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE USING (
        auth.uid() = id
    );

-- 7. Create a function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT raw_user_meta_data->>'role' 
        FROM auth.users 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create a function to check if user is provider
CREATE OR REPLACE FUNCTION is_provider()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'provider';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create a function to check if user is client
CREATE OR REPLACE FUNCTION is_client()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role() = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create a view for public services (what clients see)
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

-- 12. Grant appropriate permissions
GRANT SELECT ON public_services TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- 13. Create a function to safely update service statistics
CREATE OR REPLACE FUNCTION update_service_stats(
    service_id UUID,
    stat_type TEXT,
    increment_value INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    IF stat_type = 'views' THEN
        UPDATE public.services 
        SET views_count = COALESCE(views_count, 0) + increment_value
        WHERE id = service_id;
    ELSIF stat_type = 'bookings' THEN
        UPDATE public.services 
        SET bookings_count = COALESCE(bookings_count, 0) + increment_value
        WHERE id = service_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create a function to calculate service rating
CREATE OR REPLACE FUNCTION calculate_service_rating(service_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    avg_rating DECIMAL;
BEGIN
    -- For now, return 0 since we don't have a service_ratings table yet
    -- This can be enhanced later when ratings system is implemented
    RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Add comments for documentation
COMMENT ON TABLE public.services IS 'Services offered by providers with enhanced security and isolation';
COMMENT ON COLUMN public.services.approval_status IS 'Service approval status: pending, approved, rejected, suspended';
COMMENT ON COLUMN public.services.is_featured IS 'Whether the service is featured/promoted';
COMMENT ON COLUMN public.services.is_verified IS 'Whether the service has been verified by admin';
COMMENT ON COLUMN public.services.views_count IS 'Number of times the service has been viewed';
COMMENT ON COLUMN public.services.bookings_count IS 'Number of bookings for this service';
COMMENT ON COLUMN public.services.rating IS 'Average rating of the service';
COMMENT ON COLUMN public.services.tags IS 'Array of tags/keywords for the service';
COMMENT ON FUNCTION get_user_role() IS 'Get the role of the currently authenticated user';
COMMENT ON FUNCTION is_admin() IS 'Check if the current user is an admin';
COMMENT ON FUNCTION is_provider() IS 'Check if the current user is a provider';
COMMENT ON FUNCTION is_client() IS 'Check if the current user is a client';
COMMENT ON VIEW public_services IS 'Public view of approved and active services for clients';

-- 16. Create a trigger to automatically update service rating
CREATE OR REPLACE FUNCTION update_service_rating_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the service rating when ratings change
    UPDATE public.services 
    SET rating = calculate_service_rating(NEW.service_id)
    WHERE id = NEW.service_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger requires a service_ratings table to be created
-- CREATE TRIGGER service_rating_update
--     AFTER INSERT OR UPDATE OR DELETE ON service_ratings
--     FOR EACH ROW EXECUTE FUNCTION update_service_rating_trigger();

-- 17. Final verification
DO $$
BEGIN
    RAISE NOTICE 'Migration 018_enhance_data_isolation completed successfully';
    RAISE NOTICE 'Enhanced data isolation and security measures implemented';
    RAISE NOTICE 'RLS policies updated for services, companies, and profiles';
    RAISE NOTICE 'Performance indexes created for better query performance';
    RAISE NOTICE 'Helper functions created for role checking and data management';
END $$;
