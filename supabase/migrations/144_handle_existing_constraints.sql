-- Handle existing constraints gracefully
-- Date: 2024-12-20
-- Description: Safely handle constraint already exists errors

-- This migration is idempotent and safe to run multiple times
-- It will only add constraints that don't already exist

-- Add foreign key constraints only if they don't exist
DO $$ 
BEGIN
    -- Add booking foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_booking' 
        AND table_name = 'invoices'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT fk_invoices_booking 
            FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added fk_invoices_booking constraint';
    ELSE
        RAISE NOTICE 'fk_invoices_booking constraint already exists, skipping';
    END IF;

    -- Add provider foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_provider' 
        AND table_name = 'invoices'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT fk_invoices_provider 
            FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added fk_invoices_provider constraint';
    ELSE
        RAISE NOTICE 'fk_invoices_provider constraint already exists, skipping';
    END IF;

    -- Add client foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_client' 
        AND table_name = 'invoices'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT fk_invoices_client 
            FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added fk_invoices_client constraint';
    ELSE
        RAISE NOTICE 'fk_invoices_client constraint already exists, skipping';
    END IF;
END $$;

-- Add check constraints only if they don't exist
DO $$ 
BEGIN
    -- Add provider-client different constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_provider_client_different' 
        AND table_name = 'invoices'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT check_provider_client_different 
            CHECK (provider_id != client_id);
        RAISE NOTICE 'Added check_provider_client_different constraint';
    ELSE
        RAISE NOTICE 'check_provider_client_different constraint already exists, skipping';
    END IF;

    -- Add positive amount constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_positive_amount' 
        AND table_name = 'invoices'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT check_positive_amount 
            CHECK (amount > 0);
        RAISE NOTICE 'Added check_positive_amount constraint';
    ELSE
        RAISE NOTICE 'check_positive_amount constraint already exists, skipping';
    END IF;

    -- Add total amount valid constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_total_amount_valid' 
        AND table_name = 'invoices'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.invoices 
        ADD CONSTRAINT check_total_amount_valid 
            CHECK (total_amount IS NULL OR total_amount >= amount);
        RAISE NOTICE 'Added check_total_amount_valid constraint';
    ELSE
        RAISE NOTICE 'check_total_amount_valid constraint already exists, skipping';
    END IF;
END $$;

-- Verify all constraints exist
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'invoices' 
AND table_schema = 'public'
AND constraint_name IN (
    'fk_invoices_booking',
    'fk_invoices_provider', 
    'fk_invoices_client',
    'check_provider_client_different',
    'check_positive_amount',
    'check_total_amount_valid'
)
ORDER BY constraint_name;
