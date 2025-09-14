-- Fix constraint already exists error
-- Date: 2024-12-20
-- Description: Handle constraint already exists errors gracefully

-- Drop existing constraints if they exist to avoid conflicts
DO $$ 
BEGIN
    -- Drop foreign key constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_booking' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT fk_invoices_booking;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_provider' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT fk_invoices_provider;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_invoices_client' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT fk_invoices_client;
    END IF;

    -- Drop check constraints if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_provider_client_different' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT check_provider_client_different;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_positive_amount' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT check_positive_amount;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_total_amount_valid' 
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices DROP CONSTRAINT check_total_amount_valid;
    END IF;
END $$;

-- Now add the constraints fresh
-- Add foreign key constraints to ensure data integrity
ALTER TABLE public.invoices 
ADD CONSTRAINT fk_invoices_booking 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.invoices 
ADD CONSTRAINT fk_invoices_provider 
    FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.invoices 
ADD CONSTRAINT fk_invoices_client 
    FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add validation constraints
ALTER TABLE public.invoices 
ADD CONSTRAINT check_provider_client_different 
    CHECK (provider_id != client_id);

ALTER TABLE public.invoices 
ADD CONSTRAINT check_positive_amount 
    CHECK (amount > 0);

ALTER TABLE public.invoices 
ADD CONSTRAINT check_total_amount_valid 
    CHECK (total_amount IS NULL OR total_amount >= amount);

-- Add comments for documentation
COMMENT ON CONSTRAINT fk_invoices_booking ON public.invoices IS 'Foreign key constraint linking invoices to bookings';
COMMENT ON CONSTRAINT fk_invoices_provider ON public.invoices IS 'Foreign key constraint linking invoices to provider profiles';
COMMENT ON CONSTRAINT fk_invoices_client ON public.invoices IS 'Foreign key constraint linking invoices to client profiles';
COMMENT ON CONSTRAINT check_provider_client_different ON public.invoices IS 'Ensures provider and client are different users';
COMMENT ON CONSTRAINT check_positive_amount ON public.invoices IS 'Ensures invoice amount is positive';
COMMENT ON CONSTRAINT check_total_amount_valid ON public.invoices IS 'Ensures total amount is valid';
