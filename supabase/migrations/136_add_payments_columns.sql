-- Add missing columns to payments table
-- Date: 2024-12-19
-- Description: Add booking_id, client_id, and other missing columns to payments table

-- Add missing columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS amount NUMERIC(12,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'OMR',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_response JSONB,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add constraints (drop first if exists to avoid conflicts)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'payments_status_check' 
               AND table_name = 'payments' 
               AND table_schema = 'public') THEN
        ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
    END IF;
END $$;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'));

-- Make required columns NOT NULL
ALTER TABLE public.payments 
ALTER COLUMN booking_id SET NOT NULL,
ALTER COLUMN client_id SET NOT NULL,
ALTER COLUMN provider_id SET NOT NULL,
ALTER COLUMN amount SET NOT NULL,
ALTER COLUMN currency SET NOT NULL,
ALTER COLUMN status SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON public.payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON public.payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at);

-- Update RLS policies for payments table
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
