-- Comprehensive fix for invoices and payments tables
-- Date: 2024-12-19
-- Description: Fix RLS policies and add missing columns for both tables

-- ==============================================
-- INVOICES TABLE FIXES
-- ==============================================

-- Ensure invoices table exists with correct structure
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

-- Drop all existing invoices policies
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
DROP POLICY IF EXISTS "System can create invoices" ON invoices;
DROP POLICY IF EXISTS "Read own invoices" ON invoices;
DROP POLICY IF EXISTS "Provider creates invoices for own bookings" ON invoices;

-- Create comprehensive invoices RLS policies
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create invoices" ON invoices
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        (auth.uid() = provider_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND provider_id = auth.uid()
        )) OR
        (auth.uid() = client_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND client_id = auth.uid()
        )) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        auth.uid() = provider_id OR
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_provider_id ON public.invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);

-- ==============================================
-- PAYMENTS TABLE FIXES
-- ==============================================

-- Ensure payments table exists with correct structure
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12,3) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'OMR',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    payment_intent_id TEXT,
    transaction_id TEXT,
    gateway_response JSONB,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop all existing payments policies
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "System can manage payments" ON payments;
DROP POLICY IF EXISTS "Users can create payments" ON payments;
DROP POLICY IF EXISTS "Users can update own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON payments;

-- Create comprehensive payments RLS policies
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        auth.uid() = client_id OR 
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create payments" ON payments
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        (auth.uid() = client_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND client_id = auth.uid()
        )) OR
        (auth.uid() = provider_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND provider_id = auth.uid()
        )) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update own payments" ON payments
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        auth.uid() = provider_id OR
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can delete own payments" ON payments
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        auth.uid() = provider_id OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON public.payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

-- Grant permissions for invoices table
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

-- Grant permissions for payments table
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- ==============================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================

COMMENT ON TABLE public.invoices IS 'Invoices table with comprehensive RLS policies';
COMMENT ON TABLE public.payments IS 'Payments table with comprehensive RLS policies';
