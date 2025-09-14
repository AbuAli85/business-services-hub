-- Add missing invoice fields for proper invoice generation
-- Date: 2024-12-21
-- Description: Add missing fields that SmartInvoiceService needs for invoice generation

-- Add missing columns to invoices table
DO $$
BEGIN
    -- Add service_title column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'service_title' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN service_title TEXT;
        RAISE NOTICE 'Added service_title column';
    ELSE
        RAISE NOTICE 'service_title column already exists, skipping';
    END IF;

    -- Add service_description column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'service_description' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN service_description TEXT;
        RAISE NOTICE 'Added service_description column';
    ELSE
        RAISE NOTICE 'service_description column already exists, skipping';
    END IF;

    -- Add client_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'client_name' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN client_name TEXT;
        RAISE NOTICE 'Added client_name column';
    ELSE
        RAISE NOTICE 'client_name column already exists, skipping';
    END IF;

    -- Add client_email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'client_email' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN client_email TEXT;
        RAISE NOTICE 'Added client_email column';
    ELSE
        RAISE NOTICE 'client_email column already exists, skipping';
    END IF;

    -- Add provider_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'provider_name' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN provider_name TEXT;
        RAISE NOTICE 'Added provider_name column';
    ELSE
        RAISE NOTICE 'provider_name column already exists, skipping';
    END IF;

    -- Add provider_email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'provider_email' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN provider_email TEXT;
        RAISE NOTICE 'Added provider_email column';
    ELSE
        RAISE NOTICE 'provider_email column already exists, skipping';
    END IF;

    -- Add company_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'company_name' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN company_name TEXT;
        RAISE NOTICE 'Added company_name column';
    ELSE
        RAISE NOTICE 'company_name column already exists, skipping';
    END IF;

    -- Add company_logo column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'company_logo' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN company_logo TEXT;
        RAISE NOTICE 'Added company_logo column';
    ELSE
        RAISE NOTICE 'company_logo column already exists, skipping';
    END IF;

    -- Add vat_percent column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'vat_percent' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN vat_percent NUMERIC(5,2) DEFAULT 5.0;
        RAISE NOTICE 'Added vat_percent column';
    ELSE
        RAISE NOTICE 'vat_percent column already exists, skipping';
    END IF;

    -- Add vat_amount column if it doesn't exist (this might already exist as tax_amount)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'vat_amount' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN vat_amount NUMERIC(12,3) DEFAULT 0;
        RAISE NOTICE 'Added vat_amount column';
    ELSE
        RAISE NOTICE 'vat_amount column already exists, skipping';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.invoices.service_title IS 'Title of the service being invoiced';
COMMENT ON COLUMN public.invoices.service_description IS 'Description of the service being invoiced';
COMMENT ON COLUMN public.invoices.client_name IS 'Name of the client for display purposes';
COMMENT ON COLUMN public.invoices.client_email IS 'Email of the client for display purposes';
COMMENT ON COLUMN public.invoices.provider_name IS 'Name of the provider for display purposes';
COMMENT ON COLUMN public.invoices.provider_email IS 'Email of the provider for display purposes';
COMMENT ON COLUMN public.invoices.company_name IS 'Name of the provider company for display purposes';
COMMENT ON COLUMN public.invoices.company_logo IS 'Logo URL of the provider company for display purposes';
COMMENT ON COLUMN public.invoices.vat_percent IS 'VAT percentage applied to the invoice';
COMMENT ON COLUMN public.invoices.vat_amount IS 'VAT amount calculated for the invoice';

-- Update existing invoices to have default values for new fields
UPDATE public.invoices 
SET 
    vat_percent = COALESCE(vat_percent, 5.0),
    vat_amount = COALESCE(vat_amount, tax_amount, 0)
WHERE vat_percent IS NULL OR vat_amount IS NULL;
