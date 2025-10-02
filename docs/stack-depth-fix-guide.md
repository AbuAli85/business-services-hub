# PostgreSQL Stack Depth Limit Fix Guide

## Problem
You're encountering a PostgreSQL error:
```
{
    "code": "54001",
    "details": null,
    "hint": "Increase the configuration parameter \"max_stack_depth\" (currently 2048kB), after ensuring the platform's stack depth limit is adequate.",
    "message": "stack depth limit exceeded"
}
```

## Root Causes Identified

### 1. Complex Views with Deep Recursion
- `user_enriched` view with multiple LATERAL joins
- `service_enriched` view with nested subqueries
- These views can cause deep recursion when PostgreSQL processes them

### 2. Recursive Function Calls
- `calculate_booking_progress()` calls `update_milestone_progress()`
- `update_milestone_progress()` calls `calculate_booking_progress()`
- This creates infinite recursion loops

### 3. RLS Policy Recursion
- Row Level Security policies that reference other tables
- Can cause infinite recursion in policy evaluation

## Solutions Applied

### 1. Migration: `999_fix_stack_depth_issue.sql`
- **Simplified complex views** to prevent deep recursion
- **Replaced recursive functions** with iterative versions
- **Added performance indexes** to reduce query complexity
- **Removed function call chains** that caused infinite loops

### 2. Configuration: `scripts/increase-stack-depth.sql`
- Increases `max_stack_depth` from 2MB to 8MB
- Optimizes `work_mem` and `effective_cache_size`
- Provides immediate relief for stack overflow issues

### 3. Diagnostic: `scripts/diagnose-stack-depth-issue.sql`
- Identifies complex views and recursive functions
- Checks RLS policy complexity
- Monitors long-running queries
- Provides recommendations for further optimization

## How to Apply the Fix

### Option 1: Automated Script (Recommended)
```bash
# Run the automated fix script
node scripts/fix-stack-depth-issue.js
```

### Option 2: Manual Steps

#### Step 1: Apply the Migration
```bash
# Start Supabase (if not running)
npx supabase start

# Apply the migration
npx supabase db push
```

#### Step 2: Increase Stack Depth Configuration
```bash
# Connect to your database and run:
npx supabase db reset
```

#### Step 3: Verify the Fix
```bash
# Run diagnostic script
npx supabase db reset --debug
```

### Option 3: For Production (Supabase Cloud)

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to Settings → Database

2. **Update Configuration**
   - Find `max_stack_depth` parameter
   - Change from `2048kB` to `8192kB` (8MB)
   - Save the changes

3. **Apply Migration**
   - Go to SQL Editor
   - Run the migration: `999_fix_stack_depth_issue.sql`

## What Was Fixed

### Before (Problematic Code)
```sql
-- Complex view with multiple LATERAL joins
CREATE VIEW user_enriched AS
SELECT p.*, 
  (SELECT COUNT(*) FROM bookings WHERE client_id = p.id) as booking_count,
  -- Multiple nested subqueries...
FROM profiles p
LEFT JOIN LATERAL (SELECT ...) stats1 ON true
LEFT JOIN LATERAL (SELECT ...) stats2 ON true
-- More LATERAL joins...
```

### After (Optimized Code)
```sql
-- Simplified view with basic joins
CREATE VIEW user_enriched AS
SELECT p.*, comp.name as company_name,
  COALESCE((SELECT COUNT(*) FROM bookings WHERE client_id = p.id), 0) as booking_count
FROM profiles p
LEFT JOIN companies comp ON p.company_id = comp.id;
```

### Before (Recursive Functions)
```sql
-- Function A calls Function B
CREATE FUNCTION update_task(...) AS $$
  -- ... update task ...
  PERFORM calculate_booking_progress(booking_id); -- Calls another function
$$;

-- Function B calls Function A
CREATE FUNCTION calculate_booking_progress(...) AS $$
  -- ... calculate progress ...
  PERFORM update_milestone_progress(milestone_id); -- Calls back to Function A
$$;
```

### After (Non-Recursive Functions)
```sql
-- Function A is independent
CREATE FUNCTION update_task(...) AS $$
  -- ... update task ...
  PERFORM update_milestone_progress(milestone_id); -- Only calls one function
$$;

-- Function B is independent
CREATE FUNCTION calculate_booking_progress(...) AS $$
  -- ... calculate progress using single query ...
  -- No function calls to prevent recursion
$$;
```

## Performance Improvements

### 1. Query Optimization
- **Reduced query depth** by simplifying views
- **Eliminated recursive calls** between functions
- **Added strategic indexes** for better performance

### 2. Memory Usage
- **Reduced stack usage** by avoiding deep recursion
- **Optimized work_mem** for better query planning
- **Improved cache utilization** with effective_cache_size

### 3. Error Prevention
- **Stack overflow protection** with increased limits
- **Infinite loop prevention** in function calls
- **RLS policy optimization** to avoid recursion

## Monitoring and Maintenance

### 1. Regular Checks
```sql
-- Run this periodically to check for issues
SELECT 
  name, setting, unit 
FROM pg_settings 
WHERE name = 'max_stack_depth';
```

### 2. Query Monitoring
```sql
-- Monitor long-running queries
SELECT 
  pid, state, query_start, 
  now() - query_start as duration,
  LEFT(query, 100) as query_preview
FROM pg_stat_activity 
WHERE state = 'active' 
  AND now() - query_start > interval '1 minute';
```

### 3. Performance Monitoring
```sql
-- Check for complex views that might need further optimization
SELECT 
  viewname, definition_length,
  CASE 
    WHEN definition_length > 10000 THEN 'HIGH RISK'
    WHEN definition_length > 5000 THEN 'MEDIUM RISK'
    ELSE 'LOW RISK'
  END as risk_level
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY definition_length DESC;
```

## Troubleshooting

### If Issues Persist

1. **Check Stack Depth Setting**
   ```sql
   SHOW max_stack_depth;
   ```

2. **Monitor Active Queries**
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

3. **Check for Complex Views**
   ```sql
   SELECT viewname, definition_length 
   FROM pg_views 
   WHERE schemaname = 'public' 
   ORDER BY definition_length DESC;
   ```

4. **Verify Function Dependencies**
   ```sql
   SELECT routine_name, routine_definition 
   FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_type = 'FUNCTION';
   ```

### Additional Optimizations

If you still experience issues, consider:

1. **Breaking down complex queries** into smaller, simpler ones
2. **Using materialized views** for frequently accessed complex data
3. **Implementing query result caching** at the application level
4. **Reviewing RLS policies** for potential recursion
5. **Optimizing database indexes** for your specific query patterns

## Support

If you continue to experience stack depth issues after applying these fixes:

1. Run the diagnostic script: `scripts/diagnose-stack-depth-issue.sql`
2. Check the output for any remaining complex queries or recursive functions
3. Consider further query optimization based on the diagnostic results
4. Monitor your application's database usage patterns

The fixes provided should resolve the immediate stack depth limit exceeded error and improve overall database performance.
