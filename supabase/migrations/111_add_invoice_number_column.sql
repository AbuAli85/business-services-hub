-- Add missing invoice_number column to invoices table
-- This fixes the error: column "invoice number" of relation "invoices" does not exist

-- Add invoice_number column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'invoice_number'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN invoice_number TEXT;
        RAISE NOTICE 'Added invoice_number column to invoices table';
    ELSE
        RAISE NOTICE 'invoice_number column already exists in invoices table';
    END IF;
END $$;

-- Create a function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get the next counter value
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
    INTO counter
    FROM invoices
    WHERE invoice_number ~ '^INV-\d+$';
    
    -- Generate the new invoice number
    new_number := 'INV-' || LPAD(counter::TEXT, 6, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := generate_invoice_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON public.invoices;

-- Create trigger to auto-generate invoice numbers
CREATE TRIGGER trigger_set_invoice_number
    BEFORE INSERT ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION set_invoice_number();

-- Update existing invoices with generated invoice numbers
UPDATE public.invoices 
SET invoice_number = generate_invoice_number()
WHERE invoice_number IS NULL OR invoice_number = '';

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.invoice_number IS 'Unique invoice number in format INV-XXXXXX';
COMMENT ON FUNCTION generate_invoice_number() IS 'Generates unique invoice numbers in format INV-XXXXXX';
COMMENT ON FUNCTION set_invoice_number() IS 'Trigger function to auto-generate invoice numbers for new invoices';
