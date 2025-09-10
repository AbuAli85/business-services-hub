-- Create payments table with proper structure
-- Date: 2024-12-19
-- Description: Create payments table with booking_id and other necessary columns

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12,3) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'OMR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    payment_method TEXT, -- stripe, bank_transfer, cash, etc.
    payment_intent_id TEXT, -- Stripe payment intent ID
    transaction_id TEXT, -- External transaction reference
    gateway_response JSONB, -- Store gateway response data
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "System can manage payments" ON payments;
DROP POLICY IF EXISTS "Users can create payments" ON payments;
DROP POLICY IF EXISTS "Users can update own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON payments;

-- Create comprehensive RLS policies

-- 1. SELECT policy - Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        -- Service role can bypass RLS
        auth.role() = 'service_role' OR
        -- Users can view payments where they are the client
        auth.uid() = client_id OR 
        -- Users can view payments where they are the provider
        auth.uid() = provider_id OR
        -- Admins can view all payments
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. INSERT policy - Users can create payments
CREATE POLICY "Users can create payments" ON payments
    FOR INSERT WITH CHECK (
        -- Service role can bypass RLS
        auth.role() = 'service_role' OR
        -- Clients can create payments for their bookings
        (auth.uid() = client_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND client_id = auth.uid()
        )) OR
        -- Providers can create payments for their services
        (auth.uid() = provider_id AND EXISTS (
            SELECT 1 FROM bookings 
            WHERE id = booking_id AND provider_id = auth.uid()
        )) OR
        -- Admins can create any payment
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. UPDATE policy - Users can update their own payments
CREATE POLICY "Users can update own payments" ON payments
    FOR UPDATE USING (
        -- Service role can bypass RLS
        auth.role() = 'service_role' OR
        -- Users can update payments where they are the provider
        auth.uid() = provider_id OR
        -- Users can update payments where they are the client
        auth.uid() = client_id OR
        -- Admins can update any payment
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. DELETE policy - Users can delete their own payments
CREATE POLICY "Users can delete own payments" ON payments
    FOR DELETE USING (
        -- Service role can bypass RLS
        auth.role() = 'service_role' OR
        -- Users can delete payments where they are the provider
        auth.uid() = provider_id OR
        -- Admins can delete any payment
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON public.payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- Grant necessary permissions
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- Add comments for documentation
COMMENT ON TABLE public.payments IS 'Payments table with comprehensive RLS policies';
COMMENT ON COLUMN public.payments.booking_id IS 'Reference to the booking this payment is for';
COMMENT ON COLUMN public.payments.invoice_id IS 'Reference to the invoice this payment is for (optional)';
COMMENT ON COLUMN public.payments.client_id IS 'Client who made the payment';
COMMENT ON COLUMN public.payments.provider_id IS 'Provider who receives the payment';
COMMENT ON COLUMN public.payments.amount IS 'Payment amount';
COMMENT ON COLUMN public.payments.currency IS 'Payment currency (default: OMR)';
COMMENT ON COLUMN public.payments.status IS 'Payment status: pending, processing, completed, failed, cancelled, refunded';
COMMENT ON COLUMN public.payments.payment_method IS 'Payment method used (stripe, bank_transfer, cash, etc.)';
COMMENT ON COLUMN public.payments.payment_intent_id IS 'Stripe payment intent ID for tracking';
COMMENT ON COLUMN public.payments.transaction_id IS 'External transaction reference';
COMMENT ON COLUMN public.payments.gateway_response IS 'Store gateway response data as JSON';
