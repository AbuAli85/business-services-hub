-- Final fix for invoices table permissions
-- Date: 2024-12-19
-- Description: Comprehensive fix for invoices table RLS policies and permissions

-- First, ensure the invoices table has all necessary columns
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,3),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

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

-- Create comprehensive RLS policies

-- 1. SELECT policy - Allow service role and authenticated users to view invoices
CREATE POLICY "Allow invoice access" ON invoices
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        auth.uid() IS NOT NULL
    );

-- 2. INSERT policy - Allow service role and authenticated users to create invoices
CREATE POLICY "Allow invoice creation" ON invoices
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        auth.uid() IS NOT NULL
    );

-- 3. UPDATE policy - Allow service role and authenticated users to update invoices
CREATE POLICY "Allow invoice updates" ON invoices
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        auth.uid() IS NOT NULL
    );

-- 4. DELETE policy - Allow service role and authenticated users to delete invoices
CREATE POLICY "Allow invoice deletion" ON invoices
    FOR DELETE USING (
        auth.role() = 'service_role' OR
        auth.uid() IS NOT NULL
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_provider_id ON public.invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- Grant necessary permissions
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT ALL ON public.invoices TO anon;

-- Update existing invoices to have calculated values
UPDATE public.invoices 
SET 
    total_amount = COALESCE(total_amount, amount),
    due_date = COALESCE(due_date, created_at + INTERVAL '30 days'),
    invoice_number = COALESCE(invoice_number, 'INV-' || UPPER(SUBSTRING(id::text, 1, 8)))
WHERE total_amount IS NULL OR due_date IS NULL OR invoice_number IS NULL;

-- Add comments for documentation
COMMENT ON TABLE public.invoices IS 'Invoices table with comprehensive RLS policies and all necessary columns';
COMMENT ON POLICY "Allow invoice access" ON invoices IS 'Allows service role and authenticated users to view invoices';
COMMENT ON POLICY "Allow invoice creation" ON invoices IS 'Allows service role and authenticated users to create invoices';
COMMENT ON POLICY "Allow invoice updates" ON invoices IS 'Allows service role and authenticated users to update invoices';
COMMENT ON POLICY "Allow invoice deletion" ON invoices IS 'Allows service role and authenticated users to delete invoices';
