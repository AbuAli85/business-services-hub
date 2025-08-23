-- Update companies table schema to match the form requirements
-- This migration adds missing columns for comprehensive company profiles

-- Add missing columns to companies table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'description') THEN
        ALTER TABLE public.companies ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'address') THEN
        ALTER TABLE public.companies ADD COLUMN address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'phone') THEN
        ALTER TABLE public.companies ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'email') THEN
        ALTER TABLE public.companies ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'website') THEN
        ALTER TABLE public.companies ADD COLUMN website TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'industry') THEN
        ALTER TABLE public.companies ADD COLUMN industry TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'size') THEN
        ALTER TABLE public.companies ADD COLUMN size TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'founded_year') THEN
        ALTER TABLE public.companies ADD COLUMN founded_year INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'updated_at') THEN
        ALTER TABLE public.companies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Add indexes for better performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'companies' AND indexname = 'companies_industry_idx') THEN
        CREATE INDEX companies_industry_idx ON public.companies(industry);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'companies' AND indexname = 'companies_size_idx') THEN
        CREATE INDEX companies_size_idx ON public.companies(size);
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE tablename = 'companies' AND indexname = 'companies_founded_year_idx') THEN
        CREATE INDEX companies_founded_year_idx ON public.companies(founded_year);
    END IF;
END $$;

-- Create trigger function
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'companies_updated_at_trigger') THEN
        CREATE TRIGGER companies_updated_at_trigger
            BEFORE UPDATE ON public.companies
            FOR EACH ROW
            EXECUTE FUNCTION update_companies_updated_at();
    END IF;
END $$;

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Companies policies" ON public.companies;

CREATE POLICY "Companies policies" ON public.companies
    FOR ALL USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.companies TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
