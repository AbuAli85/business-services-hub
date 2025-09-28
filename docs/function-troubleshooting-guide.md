# Function Troubleshooting Guide

## Quick Fix for Column Error

If you get the error `column "routine_name" does not exist`, use the **simplified script** instead:

```sql
-- Use this script instead
\i scripts/simple-function-check.sql
```

## Available Scripts

### 1. **Simple Function Check** (Recommended)
```bash
# Run this in Supabase SQL editor
\i scripts/simple-function-check.sql
```

**Features:**
- ✅ Robust error handling
- ✅ Works with different schema versions
- ✅ Tests function existence
- ✅ Tests function functionality
- ✅ Handles missing tables gracefully

### 2. **Detailed Function Check** (Advanced)
```bash
# Run this in Supabase SQL editor
\i scripts/check-function-status.sql
```

**Features:**
- 🔍 Detailed function analysis
- 📊 Parameter inspection
- 🔄 Duplicate detection
- ⚠️ More complex queries

## Common Issues & Solutions

### Issue 1: Column "routine_name" does not exist
**Error:** `ERROR: 42703: column "routine_name" does not exist`

**Solution:** Use the simplified script:
```sql
\i scripts/simple-function-check.sql
```

### Issue 2: Functions don't exist
**Error:** `function calculate_booking_progress(uuid) does not exist`

**Solution:** Apply the cleanup migration:
```bash
supabase migration up 160
# or
supabase db push
```

### Issue 3: Duplicate functions
**Error:** Multiple function versions causing conflicts

**Solution:** The cleanup migration removes all duplicates and creates single versions.

### Issue 4: Permission denied
**Error:** `permission denied for function`

**Solution:** Grant permissions:
```sql
GRANT EXECUTE ON FUNCTION calculate_booking_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_milestone_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_task(uuid, text, text, timestamptz, integer, numeric, text) TO authenticated;
```

## Step-by-Step Troubleshooting

### Step 1: Check Function Status
```sql
-- Run the simple check
\i scripts/simple-function-check.sql
```

### Step 2: Apply Cleanup (if needed)
```bash
# Apply the cleanup migration
supabase migration up 160
```

### Step 3: Verify Functions Work
```sql
-- Test with real data
SELECT calculate_booking_progress('your-booking-id');
```

### Step 4: Check API Integration
```bash
# Test via API
curl https://your-domain.com/api/test-db-functions
```

## Expected Results

### ✅ Success Indicators
- All 3 functions exist (count = 1 each)
- Functions execute without errors
- Progress calculations work correctly
- No duplicate function warnings

### ❌ Failure Indicators
- Functions don't exist
- Multiple versions of same function
- Permission errors
- SQL syntax errors

## Quick Commands

### Check Function Count
```sql
SELECT routine_name, COUNT(*) 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task')
GROUP BY routine_name;
```

### Test Single Function
```sql
-- Test calculate_booking_progress
SELECT calculate_booking_progress('your-booking-id');

-- Test update_milestone_progress
SELECT update_milestone_progress('your-milestone-id');

-- Test update_task
SELECT update_task('your-task-id', 'Test', 'completed');
```

### Check Function Signatures
```sql
SELECT routine_name, routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
```

## Migration Order

If you need to apply multiple migrations:

1. **First:** Apply cleanup migration
   ```bash
   supabase migration up 160
   ```

2. **Then:** Verify functions work
   ```sql
   \i scripts/simple-function-check.sql
   ```

3. **Finally:** Test API integration
   ```bash
   curl https://your-domain.com/api/test-db-functions
   ```

## Need Help?

If you're still having issues:

1. **Check the logs** in Supabase dashboard
2. **Run the simple script** to get detailed error messages
3. **Verify your database schema** has the required tables
4. **Check permissions** for your database user

The simplified script will give you the most helpful error messages! 🎯
