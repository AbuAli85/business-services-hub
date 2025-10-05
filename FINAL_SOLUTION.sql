-- FINAL SOLUTION - Create audit_logs table to satisfy application code
-- The error is coming from your application code, not database triggers

-- Step 1: Create a simple audit_logs table to satisfy the application
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT,
    record_id TEXT,  -- Using TEXT to avoid UUID conversion issues
    action TEXT,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 3: Create basic RLS policies
DROP POLICY IF EXISTS "audit_logs_policy" ON audit_logs;
CREATE POLICY "audit_logs_policy" ON audit_logs
    FOR ALL USING (true);

-- Step 4: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 5: Test milestone access
SELECT COUNT(*) as milestone_count FROM milestones LIMIT 1;

-- Step 6: Test audit_logs access
INSERT INTO audit_logs (table_name, record_id, action) 
VALUES ('test', 'test-record', 'INSERT');

-- Step 7: Clean up test data
DELETE FROM audit_logs WHERE table_name = 'test';

SELECT 'audit_logs table created successfully. Application code should now work without errors.' as status;
