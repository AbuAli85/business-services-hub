-- Fix invoices table permissions
-- Date: 2024-12-19
-- Description: Comprehensive fix for invoices table RLS policies and permissions

-- First, ensure the invoices table exists and has the correct structure
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12,3) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'OMR',
    status TEXT NOT NULL DEFAULT 'draft',
    pdf_url TEXT,
    invoice_pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on invoices table
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "System can create invoices" ON invoices;
DROP POLICY IF EXISTS "Read own invoices" ON invoices;
DROP POLICY IF EXISTS "Provider creates invoices for own bookings" ON invoices;

-- Create comprehensive RLS policies

-- 1. SELECT policy - Users can view their own invoices
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (
        -- Service role can bypass RLS
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

-- 2. INSERT policy - Users can create invoices
CREATE POLICY "Users can create invoices" ON invoices
    FOR INSERT WITH CHECK (
        -- Service role can bypass RLS
        auth.role() = 'service_role' OR
        -- Providers can create invoices for their services
        (auth.uid() = provider_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND provider_id = auth.uid()
        )) OR
        -- Clients can create invoices from their own bookings
        (auth.uid() = client_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND client_id = auth.uid()
        )) OR
        -- Admins can create any invoice
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. UPDATE policy - Users can update their own invoices
CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (
        -- Service role can bypass RLS
        auth.role() = 'service_role' OR
        -- Users can update invoices where they are the provider
        auth.uid() = provider_id OR
        -- Users can update invoices where they are the client
        auth.uid() = client_id OR
        -- Admins can update any invoice
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. DELETE policy - Users can delete their own invoices
CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (
        -- Service role can bypass RLS
        auth.role() = 'service_role' OR
        -- Users can delete invoices where they are the provider
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

-- Grant necessary permissions
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

-- Add comments for documentation
COMMENT ON TABLE public.invoices IS 'Invoices table with comprehensive RLS policies';
COMMENT ON POLICY "Users can view own invoices" ON invoices IS 'Allows users to view invoices where they are client or provider, admins can view all';
COMMENT ON POLICY "Users can create invoices" ON invoices IS 'Allows providers to create invoices for their services, clients for their bookings, admins for any';
COMMENT ON POLICY "Users can update own invoices" ON invoices IS 'Allows users to update invoices where they are client or provider, admins can update any';
COMMENT ON POLICY "Users can delete own invoices" ON invoices IS 'Allows providers to delete their invoices, admins can delete any';
