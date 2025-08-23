-- Fix Schema Cache Issues
-- This migration ensures all required columns exist and fixes schema cache problems

-- 1. Ensure profiles table has all required columns
DO $$ 
BEGIN
    -- Add company_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
        ALTER TABLE public.profiles ADD COLUMN company_id UUID NULL;
    END IF;
    
    -- Add any other missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 2. Ensure companies table has all required columns
DO $$ 
BEGIN
    -- Add owner_id if it doesn't exist (should be created_by in actual schema)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'owner_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'created_by') THEN
            -- Rename created_by to owner_id for compatibility
            ALTER TABLE public.companies RENAME COLUMN created_by TO owner_id;
        ELSE
            ALTER TABLE public.companies ADD COLUMN owner_id UUID NOT NULL;
        END IF;
    END IF;
    
    -- Add all the missing columns that the application expects
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'description') THEN
        ALTER TABLE public.companies ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'cr_number') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'registration_number') THEN
            ALTER TABLE public.companies RENAME COLUMN registration_number TO cr_number;
        ELSE
            ALTER TABLE public.companies ADD COLUMN cr_number TEXT;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'vat_number') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'tax_number') THEN
            ALTER TABLE public.companies RENAME COLUMN tax_number TO vat_number;
        ELSE
            ALTER TABLE public.companies ADD COLUMN vat_number TEXT;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'location') THEN
            ALTER TABLE public.companies RENAME COLUMN location TO address;
        ELSE
            ALTER TABLE public.companies ADD COLUMN address TEXT;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'phone') THEN
        ALTER TABLE public.companies ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'email') THEN
        ALTER TABLE public.companies ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'website') THEN
        ALTER TABLE public.companies ADD COLUMN website TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'industry') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'type') THEN
            ALTER TABLE public.companies RENAME COLUMN type TO industry;
        ELSE
            ALTER TABLE public.companies ADD COLUMN industry TEXT;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'size') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'business_type') THEN
            ALTER TABLE public.companies RENAME COLUMN business_type TO size;
        ELSE
            ALTER TABLE public.companies ADD COLUMN size TEXT;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'founded_year') THEN
        ALTER TABLE public.companies ADD COLUMN founded_year INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'updated_at') THEN
        ALTER TABLE public.companies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 3. Ensure services table has all required columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'title') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'service_name') THEN
            ALTER TABLE public.services RENAME COLUMN service_name TO title;
        ELSE
            ALTER TABLE public.services ADD COLUMN title TEXT NOT NULL;
        END IF;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'provider_id') THEN
        ALTER TABLE public.services ADD COLUMN provider_id UUID NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'company_id') THEN
        ALTER TABLE public.services ADD COLUMN company_id UUID;
    END IF;
END $$;

-- 4. Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- First, clean up orphaned services that reference non-existent profiles
    DELETE FROM public.services 
    WHERE provider_id NOT IN (SELECT id FROM public.profiles);
    
    -- Clean up orphaned services that reference non-existent companies
    DELETE FROM public.services 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM public.companies);
    
    -- Clean up orphaned bookings that reference non-existent services
    DELETE FROM public.bookings 
    WHERE service_id NOT IN (SELECT id FROM public.services);
    
    -- Clean up orphaned bookings that reference non-existent profiles
    DELETE FROM public.bookings 
    WHERE client_id NOT IN (SELECT id FROM public.profiles)
    OR provider_id NOT IN (SELECT id FROM public.profiles);
    
    -- Now add foreign key constraints safely
    -- Add foreign key for companies.owner_id -> profiles.id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'companies' 
        AND constraint_name LIKE '%owner_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.companies 
        ADD CONSTRAINT companies_owner_id_fkey 
        FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for services.provider_id -> profiles.id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'services' 
        AND constraint_name LIKE '%provider_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.services 
        ADD CONSTRAINT services_provider_id_fkey 
        FOREIGN KEY (provider_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Add foreign key for services.company_id -> companies.id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'services' 
        AND constraint_name LIKE '%company_id%'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE public.services 
        ADD CONSTRAINT services_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_services_provider_id ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_company_id ON public.services(company_id);

-- 6. Add updated_at trigger for companies table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'companies_updated_at_trigger') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $function$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $function$ language 'plpgsql';
        
        CREATE TRIGGER companies_updated_at_trigger
            BEFORE UPDATE ON public.companies
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 7. Refresh schema cache by running ANALYZE
ANALYZE public.profiles;
ANALYZE public.companies;
ANALYZE public.services;
