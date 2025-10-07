# Database Fix Instructions

## 🚨 URGENT: Apply Database Schema Fix

The 500 error is caused by conflicting `milestone_approvals` table schemas. You need to apply the database fix script in your Supabase dashboard.

## Steps to Fix:

### 1. Open Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to **SQL Editor**

### 2. Run the Fix Script
Copy and paste the entire contents of `fix_milestone_approvals_schema_conflict.sql` into the SQL editor and run it.

### 3. Verify the Fix
After running the script, the query should work:
```sql
SELECT id, milestone_id, status, created_at, milestones(title) 
FROM milestone_approvals 
ORDER BY created_at DESC 
LIMIT 20;
```

## What the Script Does:
- ✅ Drops the conflicted table completely
- ✅ Creates a clean, consistent schema
- ✅ Sets up proper RLS policies
- ✅ Grants necessary permissions
- ✅ Adds helpful indexes

## Alternative: Quick Test
If you want to test immediately without the full fix, the code has been updated with a fallback mechanism that will:
1. Try the join query first
2. If it fails, use separate queries
3. Combine the results manually

This should prevent the 500 error temporarily while you apply the database fix.

## Expected Result:
After applying the database fix, you should see:
- ✅ No more 500 errors on milestone_approvals queries
- ✅ Proper foreign key relationships working
- ✅ Dashboard loading without errors
