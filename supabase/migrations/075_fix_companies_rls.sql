-- Migration: Fix Companies RLS Policies
-- Description: Create simple, non-recursive RLS policies for companies table
-- Date: 2024-12-20

-- Drop all existing policies on companies table
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update own company" ON public.companies;
DROP POLICY IF EXISTS "Users can insert own company" ON public.companies;
DROP POLICY IF EXISTS "Service role can manage companies" ON public.companies;

-- Create simple policies

-- Policy 1: Users can view their own company
CREATE POLICY "Users can view own company" ON public.companies
    FOR SELECT USING (auth.uid() = owner_id);

-- Policy 2: Users can update their own company
CREATE POLICY "Users can update own company" ON public.companies
    FOR UPDATE USING (auth.uid() = owner_id);

-- Policy 3: Users can insert their own company
CREATE POLICY "Users can insert own company" ON public.companies
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policy 4: Service role can manage all companies
CREATE POLICY "Service role can manage companies" ON public.companies
    FOR ALL USING (auth.role() = 'service_role');

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
    RAISE NOTICE 'Companies RLS policies fixed successfully!';
END $$;
