-- Fix invoice linking and RLS policies for proper provider-client relationships
-- Date: 2024-12-19
-- Description: Ensure proper linking between invoices, providers, and clients with secure RLS policies

-- First, ensure the invoices table has the correct structure
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12,3) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'OMR',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
    pdf_url TEXT,
    invoice_pdf_url TEXT,
    due_date TIMESTAMPTZ,
    invoice_number TEXT,
    subtotal NUMERIC(12,3),
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(12,3) DEFAULT 0,
    total_amount NUMERIC(12,3),
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    payment_terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
DROP POLICY IF EXISTS "System can create invoices" ON invoices;
DROP POLICY IF EXISTS "Read own invoices" ON invoices;
DROP POLICY IF EXISTS "Provider creates invoices for own bookings" ON invoices;
DROP POLICY IF EXISTS "Allow all operations for service role" ON invoices;
DROP POLICY IF EXISTS "Allow authenticated users to read invoices" ON invoices;
DROP POLICY IF EXISTS "Allow authenticated users to insert invoices" ON invoices;
DROP POLICY IF EXISTS "Allow authenticated users to update invoices" ON invoices;
DROP POLICY IF EXISTS "Allow authenticated users to delete invoices" ON invoices;
DROP POLICY IF EXISTS "Allow invoice access" ON invoices;
DROP POLICY IF EXISTS "Allow invoice creation" ON invoices;
DROP POLICY IF EXISTS "Allow invoice updates" ON invoices;
DROP POLICY IF EXISTS "Allow invoice deletion" ON invoices;

-- Create secure RLS policies for proper provider-client relationships

-- 1. SELECT policy - Users can only view invoices where they are the client or provider
CREATE POLICY "Secure invoice access" ON invoices
    FOR SELECT USING (
        -- Service role can access all invoices
        auth.role() = 'service_role' OR
        -- Users can view invoices where they are the client
        auth.uid() = client_id OR 
        -- Users can view invoices where they are the provider
        auth.uid() = provider_id OR
        -- Admins can view all invoices
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. INSERT policy - Only providers can create invoices for their own bookings
CREATE POLICY "Provider creates invoices" ON invoices
    FOR INSERT WITH CHECK (
        -- Service role can create any invoice
        auth.role() = 'service_role' OR
        -- Providers can create invoices for their own bookings
        (auth.uid() = provider_id AND 
         EXISTS (
             SELECT 1 FROM bookings 
             WHERE id = booking_id AND provider_id = auth.uid()
         )) OR
        -- Admins can create any invoice
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. UPDATE policy - Providers can update their own invoices, clients can update limited fields
CREATE POLICY "Secure invoice updates" ON invoices
    FOR UPDATE USING (
        -- Service role can update any invoice
        auth.role() = 'service_role' OR
        -- Providers can update their own invoices
        auth.uid() = provider_id OR
        -- Clients can update their own invoices (limited fields)
        auth.uid() = client_id OR
        -- Admins can update any invoice
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. DELETE policy - Only providers and admins can delete invoices
CREATE POLICY "Provider deletes invoices" ON invoices
    FOR DELETE USING (
        -- Service role can delete any invoice
        auth.role() = 'service_role' OR
        -- Providers can delete their own invoices
        auth.uid() = provider_id OR
        -- Admins can delete any invoice
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
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_provider_status ON public.invoices(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_status ON public.invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_provider ON public.invoices(booking_id, provider_id);

-- Grant necessary permissions
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

-- Update existing invoices to have calculated values if missing
UPDATE public.invoices 
SET 
    total_amount = COALESCE(total_amount, amount),
    due_date = COALESCE(due_date, created_at + INTERVAL '30 days'),
    invoice_number = COALESCE(invoice_number, 'INV-' || UPPER(SUBSTRING(id::text, 1, 8)))
WHERE total_amount IS NULL OR due_date IS NULL OR invoice_number IS NULL;

-- Add foreign key constraints to ensure data integrity (only if they don't exist)
DO $$ 
BEGIN
    -- Add booking foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_booking' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT fk_invoices_booking 
            FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
    END IF;

    -- Add provider foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_provider' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT fk_invoices_provider 
            FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- Add client foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_client' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT fk_invoices_client 
            FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.invoices IS 'Invoices table with secure RLS policies ensuring proper provider-client relationships';
COMMENT ON POLICY "Secure invoice access" ON invoices IS 'Users can only view invoices where they are the client or provider';
COMMENT ON POLICY "Provider creates invoices" ON invoices IS 'Only providers can create invoices for their own bookings';
COMMENT ON POLICY "Secure invoice updates" ON invoices IS 'Providers can update their own invoices, clients have limited update access';
COMMENT ON POLICY "Provider deletes invoices" ON invoices IS 'Only providers and admins can delete invoices';

-- Add validation constraints (only if they don't exist)
DO $$ 
BEGIN
    -- Add provider-client different constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_provider_client_different' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT check_provider_client_different 
            CHECK (provider_id != client_id);
    END IF;

    -- Add positive amount constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_positive_amount' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT check_positive_amount 
            CHECK (amount > 0);
    END IF;

    -- Add total amount valid constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_total_amount_valid' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT check_total_amount_valid 
            CHECK (total_amount IS NULL OR total_amount >= amount);
    END IF;
END $$;
