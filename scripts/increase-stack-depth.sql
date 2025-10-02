-- Increase PostgreSQL Stack Depth Configuration
-- This script increases the max_stack_depth parameter to prevent stack overflow errors

-- Method 1: Set for current session (immediate effect)
SET max_stack_depth = '8MB';

-- Method 2: Set for current database (persists for this database)
ALTER DATABASE postgres SET max_stack_depth = '8MB';

-- Method 3: Show current configuration
SHOW max_stack_depth;

-- Method 4: Show all stack-related configurations
SELECT name, setting, unit, context 
FROM pg_settings 
WHERE name LIKE '%stack%' OR name LIKE '%depth%';

-- Additional optimizations to reduce stack usage
-- Set work_mem to a reasonable value to prevent excessive memory usage
SET work_mem = '256MB';

-- Set effective_cache_size to help with query planning
SET effective_cache_size = '1GB';

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'Stack depth configuration updated:';
    RAISE NOTICE 'max_stack_depth set to 8MB (increased from default 2MB)';
    RAISE NOTICE 'work_mem set to 256MB for better query performance';
    RAISE NOTICE 'effective_cache_size set to 1GB for improved planning';
    RAISE NOTICE 'These settings will help prevent stack depth limit exceeded errors';
END $$;
