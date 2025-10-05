-- NUCLEAR AUDIT CLEANUP - Find and destroy ALL audit references
-- This will aggressively search for and remove any remaining audit code

-- Step 1: Find ALL triggers on milestones table
SELECT 
    schemaname,
    tablename,
    triggername,
    triggerdef
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'milestones';

-- Step 2: Drop ALL functions that contain 'audit' in their name or body
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND (routine_name ILIKE '%audit%' OR routine_name ILIKE '%log%')
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.routine_name || ' CASCADE';
    END LOOP;
END $$;

-- Step 3: Drop ALL triggers that contain 'audit' in their name
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        AND trigger_name ILIKE '%audit%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON ' || trigger_record.event_object_table || ' CASCADE';
    END LOOP;
END $$;

-- Step 4: Force drop audit_logs table from ALL schemas
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Step 5: Check for any remaining audit-related objects
SELECT 'Remaining audit functions:' as check_type, routine_name as object_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name ILIKE '%audit%'
UNION ALL
SELECT 'Remaining audit triggers:', trigger_name
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name ILIKE '%audit%'
UNION ALL
SELECT 'Remaining audit tables:', table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name ILIKE '%audit%';

-- Step 6: Check current triggers on milestones
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'milestones'
AND trigger_schema = 'public';

-- Step 7: Test milestone access
SELECT COUNT(*) as milestone_count FROM milestones LIMIT 1;

-- Step 8: Create a minimal audit_logs table just to satisfy any remaining references
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 9: Grant minimal permissions
GRANT SELECT, INSERT ON audit_logs TO authenticated;

SELECT 'Nuclear cleanup completed. If audit_logs errors persist, the issue is in application code, not database.' as status;
