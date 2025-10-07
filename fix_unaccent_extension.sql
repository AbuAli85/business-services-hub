-- Fix for missing unaccent extension
-- This script ensures the unaccent extension is properly installed and accessible

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Enable unaccent extension in the extensions schema
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Create a wrapper function in public schema that calls the unaccent function
-- This allows existing code to continue working without modification
CREATE OR REPLACE FUNCTION public.unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT extensions.unaccent($1);
$$;

-- Grant execute permission on the wrapper function
GRANT EXECUTE ON FUNCTION public.unaccent(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unaccent(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.unaccent(text) TO anon;

-- Test the function
SELECT 'Testing unaccent function...' as status;
SELECT public.unaccent('café') as test_result;

-- Show extension status
SELECT 'Extension status:' as info;
SELECT extname, extnamespace::regnamespace as schema_name 
FROM pg_extension 
WHERE extname = 'unaccent';

SELECT '✅ unaccent extension fixed and accessible!' as result;
