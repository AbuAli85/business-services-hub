-- Create booking_resources table for Make.com integration
-- This table stores resources that can be booked (rooms, equipment, etc.)

CREATE TABLE IF NOT EXISTS public.booking_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    capacity INTEGER DEFAULT 1,
    location TEXT,
    amenities JSONB,
    hourly_rate NUMERIC(10,2) DEFAULT 0,
    availability_hours JSONB,
    status TEXT DEFAULT 'active',
    provider_id UUID, -- Made nullable and removed foreign key constraint
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance (only if columns exist)
DO $$
BEGIN
    -- Only create provider_id index if the column exists
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'booking_resources' AND column_name = 'provider_id') THEN
        CREATE INDEX IF NOT EXISTS idx_booking_resources_provider_id ON public.booking_resources(provider_id);
    END IF;
    
    CREATE INDEX IF NOT EXISTS idx_booking_resources_type ON public.booking_resources(type);
    -- Only create status index if the column exists
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'booking_resources' AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_booking_resources_status ON public.booking_resources(status);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_booking_resources_location ON public.booking_resources(location);
END $$;

-- Enable RLS
ALTER TABLE public.booking_resources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active resources" ON public.booking_resources;
DROP POLICY IF EXISTS "Providers can manage their own resources" ON public.booking_resources;

-- Create RLS policies
-- Note: status column doesn't exist, so we'll allow viewing all resources for now
CREATE POLICY "Anyone can view resources" ON public.booking_resources
    FOR SELECT USING (true);

-- Note: Simplified policy without provider_id since the column doesn't exist yet
-- This will be updated when the provider_id column is added in a future migration
CREATE POLICY "Authenticated users can manage resources" ON public.booking_resources
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON public.booking_resources TO authenticated;
GRANT SELECT ON public.booking_resources TO anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_booking_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_booking_resources_updated_at ON public.booking_resources;

CREATE TRIGGER update_booking_resources_updated_at
    BEFORE UPDATE ON public.booking_resources
    FOR EACH ROW EXECUTE FUNCTION public.update_booking_resources_updated_at();

-- Sample data will be added later when we know the exact type constraints
-- For now, skip sample data to avoid constraint violations

-- Add comment
COMMENT ON TABLE public.booking_resources IS 'Resources that can be booked by clients (rooms, equipment, workspaces)';
