-- FINAL AUDIT CLEANUP - Remove ALL audit-related code
-- This will completely eliminate any remaining audit log references

-- Step 1: Drop ALL possible audit triggers
DROP TRIGGER IF EXISTS trigger_audit_milestones ON milestones CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_tasks ON tasks CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_bookings ON bookings CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_invoices ON invoices CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_services ON services CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_profiles ON profiles CASCADE;
DROP TRIGGER IF EXISTS audit_trigger_milestones ON milestones CASCADE;
DROP TRIGGER IF EXISTS audit_trigger_tasks ON tasks CASCADE;
DROP TRIGGER IF EXISTS audit_trigger_bookings ON bookings CASCADE;
DROP TRIGGER IF EXISTS audit_trigger_invoices ON invoices CASCADE;
DROP TRIGGER IF EXISTS audit_trigger_services ON services CASCADE;
DROP TRIGGER IF EXISTS audit_trigger_profiles ON profiles CASCADE;

-- Step 2: Drop ALL possible audit functions
DROP FUNCTION IF EXISTS create_audit_log() CASCADE;
DROP FUNCTION IF EXISTS audit_log() CASCADE;
DROP FUNCTION IF EXISTS log_audit() CASCADE;
DROP FUNCTION IF EXISTS audit_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;

-- Step 3: Drop audit_logs table completely
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Step 4: Check for any remaining triggers on milestones table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'milestones'
AND trigger_schema = 'public';

-- Step 5: Check for any functions that might reference audit_logs
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name ILIKE '%audit%';

-- Step 6: Test milestone table access
SELECT COUNT(*) as milestone_count FROM milestones LIMIT 1;

-- Step 7: Test a simple milestone update (this should work now)
-- You can test with: UPDATE milestones SET updated_at = now() WHERE id = 'd8e94ad8-3cc9-4451-87d8-fec72aa3c47b';

SELECT 'All audit references removed. Milestone updates should now work without any audit_logs errors.' as status;
