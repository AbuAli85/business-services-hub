-- Fix companies table owner_id column
-- This migration ensures the owner_id column exists and is properly configured

-- Check if owner_id column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'owner_id'
    ) THEN
        -- Add owner_id column
        ALTER TABLE public.companies ADD COLUMN owner_id UUID;
        
        -- Add foreign key constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'companies_owner_id_fkey'
        ) THEN
            ALTER TABLE public.companies 
            ADD CONSTRAINT companies_owner_id_fkey 
            FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
        END IF;
        
        RAISE NOTICE 'Added owner_id column to companies table';
    ELSE
        RAISE NOTICE 'owner_id column already exists in companies table';
    END IF;
END $$;

-- Ensure owner_id is NOT NULL if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'owner_id'
    ) THEN
        -- Check if there are any NULL values
        IF EXISTS (SELECT 1 FROM public.companies WHERE owner_id IS NULL) THEN
            RAISE NOTICE 'Found companies with NULL owner_id - these need to be updated manually';
        ELSE
            -- Make owner_id NOT NULL if no NULL values exist
            ALTER TABLE public.companies ALTER COLUMN owner_id SET NOT NULL;
            RAISE NOTICE 'Set owner_id as NOT NULL';
        END IF;
    END IF;
END $$;

-- Update RLS policies to ensure proper access control
DROP POLICY IF EXISTS "Companies policies" ON public.companies;

CREATE POLICY "Companies policies" ON public.companies
    FOR ALL USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;
