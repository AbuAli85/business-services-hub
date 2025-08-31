-- COMPLETE FIX FOR SERVICE_PACKAGES TABLE
-- This will resolve all issues: missing columns, RLS policies, and permissions
-- Fixed version without problematic subquery-based indexes

-- 1. Add missing columns to service_packages table
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 1;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS revisions INTEGER DEFAULT 1;
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS features TEXT[];

-- 2. Update existing records to have default values
UPDATE public.service_packages SET delivery_days = 1 WHERE delivery_days IS NULL;
UPDATE public.service_packages SET revisions = 1 WHERE revisions IS NULL;
UPDATE public.service_packages SET features = '{}' WHERE features IS NULL;

-- 3. Enable RLS on service_packages table
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can insert their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can update their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Users can delete their own service packages" ON public.service_packages;
DROP POLICY IF EXISTS "Public can view approved service packages" ON public.service_packages;

-- 5. Create comprehensive RLS policies (using correct column names)
CREATE POLICY "Users can view their own service packages" ON public.service_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own service packages" ON public.service_packages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own service packages" ON public.service_packages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own service packages" ON public.service_packages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.provider_id = auth.uid()
        )
    );

CREATE POLICY "Public can view approved service packages" ON public.service_packages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.services 
            WHERE services.id = service_packages.service_id 
            AND services.status = 'active'
        )
    );

-- 6. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_packages TO authenticated;
GRANT SELECT ON public.service_packages TO anon;

-- 7. Create simple indexes for better performance (without subqueries)
CREATE INDEX IF NOT EXISTS idx_service_packages_service_id ON public.service_packages(service_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_price ON public.service_packages(price);
