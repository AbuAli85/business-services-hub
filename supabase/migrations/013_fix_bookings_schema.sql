-- Fix bookings table schema mismatch
-- This migration ensures the bookings table has the correct structure for the dashboard

-- Create or update the bookings table with the correct structure
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.service_packages(id),
    requirements JSONB,
    status TEXT NOT NULL DEFAULT 'draft',
    subtotal NUMERIC(12,3) NOT NULL DEFAULT 0,
    vat_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    vat_amount NUMERIC(12,3) GENERATED ALWAYS AS (ROUND(subtotal * vat_percent/100.0, 3)) STORED,
    total_amount NUMERIC(12,3) GENERATED ALWAYS AS (ROUND(subtotal + (subtotal * vat_percent/100.0), 3)) STORED,
    currency TEXT NOT NULL DEFAULT 'OMR',
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add provider_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'provider_id') THEN
        ALTER TABLE public.bookings ADD COLUMN provider_id UUID REFERENCES public.profiles(id);
        RAISE NOTICE 'Added provider_id column';
    END IF;
    
    -- Add subtotal column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'subtotal') THEN
        ALTER TABLE public.bookings ADD COLUMN subtotal NUMERIC(12,3) DEFAULT 0;
        RAISE NOTICE 'Added subtotal column';
    END IF;
    
    -- Add currency column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'currency') THEN
        ALTER TABLE public.bookings ADD COLUMN currency TEXT DEFAULT 'OMR';
        RAISE NOTICE 'Added currency column';
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'status') THEN
        ALTER TABLE public.bookings ADD COLUMN status TEXT DEFAULT 'draft';
        RAISE NOTICE 'Added status column';
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'created_at') THEN
        ALTER TABLE public.bookings ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'updated_at') THEN
        ALTER TABLE public.bookings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    RAISE NOTICE 'Bookings table columns updated successfully';
END $$;

-- Create necessary indexes
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

-- Enable RLS on bookings table
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Client or Provider can read booking" ON public.bookings;
DROP POLICY IF EXISTS "Client creates booking" ON public.bookings;
DROP POLICY IF EXISTS "Client or Provider update own booking" ON public.bookings;

-- Create RLS policies
CREATE POLICY "Client or Provider can read booking"
ON public.bookings FOR SELECT 
USING (
  client_id = auth.uid() OR provider_id = auth.uid()
);

CREATE POLICY "Client creates booking" 
ON public.bookings FOR INSERT 
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Client or Provider update own booking"
ON public.bookings FOR UPDATE 
USING (
  client_id = auth.uid() OR provider_id = auth.uid()
);

-- Grant necessary permissions
GRANT ALL ON public.bookings TO authenticated;
GRANT SELECT ON public.bookings TO anon;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for bookings
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
