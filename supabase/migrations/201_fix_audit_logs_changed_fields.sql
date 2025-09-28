-- Fix audit_logs table - add missing changed_fields column
-- Date: January 2025
-- Description: Add the missing changed_fields column to audit_logs table

-- Check if the column exists, if not add it
DO $$ 
BEGIN
    -- Check if changed_fields column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name = 'changed_fields'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.audit_logs 
        ADD COLUMN changed_fields TEXT[];
        
        -- Add comment
        COMMENT ON COLUMN public.audit_logs.changed_fields IS 'Array of field names that were changed in the record';
        
        RAISE NOTICE 'Added changed_fields column to audit_logs table';
    ELSE
        RAISE NOTICE 'changed_fields column already exists in audit_logs table';
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;
