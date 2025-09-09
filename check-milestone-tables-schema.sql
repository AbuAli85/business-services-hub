-- Check the current schema of milestone_comments and milestone_approvals tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('milestone_comments', 'milestone_approvals')
ORDER BY table_name, ordinal_position;
