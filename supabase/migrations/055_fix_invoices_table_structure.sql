-- Fix invoices table structure
-- This migration ensures the invoices table has the correct structure

-- First, check if the invoices table exists and has the correct structure
DO $$
BEGIN
    -- Check if invoices table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        -- Check if client_id column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'client_id') THEN
            -- Add client_id column
            ALTER TABLE public.invoices ADD COLUMN client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added client_id column to invoices table';
        END IF;
        
        -- Check if provider_id column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'provider_id') THEN
            -- Add provider_id column
            ALTER TABLE public.invoices ADD COLUMN provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added provider_id column to invoices table';
        END IF;
        
        -- Check if amount column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount') THEN
            -- Add amount column
            ALTER TABLE public.invoices ADD COLUMN amount NUMERIC(12,3) NOT NULL DEFAULT 0;
            RAISE NOTICE 'Added amount column to invoices table';
        END IF;
        
        -- Check if currency column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'currency') THEN
            -- Add currency column
            ALTER TABLE public.invoices ADD COLUMN currency TEXT NOT NULL DEFAULT 'OMR';
            RAISE NOTICE 'Added currency column to invoices table';
        END IF;
        
        -- Check if status column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'status') THEN
            -- Add status column
            ALTER TABLE public.invoices ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
            RAISE NOTICE 'Added status column to invoices table';
        END IF;
        
        -- Check if created_at column exists
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'created_at') THEN
            -- Add created_at column
            ALTER TABLE public.invoices ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
            RAISE NOTICE 'Added created_at column to invoices table';
        END IF;
        
        -- Check if invoice_pdf_url column exists (for compatibility with frontend)
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_pdf_url') THEN
            -- Add invoice_pdf_url column (alias for pdf_url)
            ALTER TABLE public.invoices ADD COLUMN invoice_pdf_url TEXT;
            RAISE NOTICE 'Added invoice_pdf_url column to invoices table';
        END IF;
        
        RAISE NOTICE 'Invoices table structure check completed';
    ELSE
        -- Create invoices table if it doesn't exist
        CREATE TABLE public.invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
            provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            amount NUMERIC(12,3) NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'OMR',
            status TEXT NOT NULL DEFAULT 'draft',
            pdf_url TEXT,
            invoice_pdf_url TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Created invoices table with correct structure';
    END IF;
END $$;

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Read own invoices" ON invoices;
DROP POLICY IF EXISTS "Provider creates invoices for own bookings" ON invoices;

-- Create new RLS policies
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create invoices" ON invoices
    FOR INSERT WITH CHECK (
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_provider_id ON public.invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
