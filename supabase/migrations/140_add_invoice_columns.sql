-- Add missing columns to invoices table for professional invoice functionality
-- Date: 2024-12-19
-- Description: Add due_date, invoice_number, and other missing columns to invoices table

-- Add missing columns to invoices table
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

-- Create index on invoice_number for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);

-- Create index on due_date for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

-- Update existing invoices to have calculated values
UPDATE public.invoices 
SET 
    total_amount = amount,
    due_date = created_at + INTERVAL '30 days'
WHERE total_amount IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.invoices.due_date IS 'Due date for invoice payment';
COMMENT ON COLUMN public.invoices.invoice_number IS 'Human-readable invoice number';
COMMENT ON COLUMN public.invoices.subtotal IS 'Subtotal before tax';
COMMENT ON COLUMN public.invoices.tax_rate IS 'Tax rate percentage';
COMMENT ON COLUMN public.invoices.tax_amount IS 'Tax amount calculated';
COMMENT ON COLUMN public.invoices.total_amount IS 'Total amount including tax';
COMMENT ON COLUMN public.invoices.paid_at IS 'Timestamp when invoice was paid';
COMMENT ON COLUMN public.invoices.payment_method IS 'Method used for payment';
COMMENT ON COLUMN public.invoices.payment_terms IS 'Payment terms and conditions';
COMMENT ON COLUMN public.invoices.notes IS 'Additional notes for the invoice';
