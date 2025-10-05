# Fix Ambiguous Column Error

## Error
```
Error updating task: {
  code: '42702',
  message: 'column reference "total_tasks" is ambiguous',
  details: 'It could refer to either a PL/pgSQL variable or a table column.'
}
```

## Root Cause

The trigger function `update_milestone_progress_on_task_change()` has variables with the **same names as column names**:

```sql
DECLARE
  total_tasks INTEGER := 0;      -- ❌ Variable name
  completed_tasks INTEGER := 0;  -- ❌ Variable name
BEGIN
  UPDATE milestones SET
    total_tasks = total_tasks,   -- ❌ Ambiguous! Which one?
    completed_tasks = completed_tasks  -- ❌ Ambiguous!
```

PostgreSQL doesn't know if you mean:
- The **variable** `total_tasks`, or
- The **column** `milestones.total_tasks`

## Solution

### **Rename Variables** to avoid conflict:

```sql
DECLARE
  task_count INTEGER := 0;          -- ✅ Clear variable name
  completed_count INTEGER := 0;     -- ✅ Clear variable name
  in_progress_count INTEGER := 0;   -- ✅ Clear variable name
  calculated_progress INTEGER := 0; -- ✅ Clear variable name
  updated_status TEXT;              -- ✅ Clear variable name
BEGIN
  UPDATE milestones SET
    total_tasks = task_count,       -- ✅ No ambiguity
    completed_tasks = completed_count -- ✅ No ambiguity
```

## How to Apply

### **Run in Supabase SQL Editor:**

1. Copy contents of `fix_ambiguous_column_error.sql`
2. Paste into SQL Editor
3. Run the script
4. Function will be recreated with fixed variable names

## What This Fixes

### **Before Fix:**
```
User clicks "Edit Task" → Error
User changes task status → Error
System updates task → Error
Progress doesn't recalculate → Stuck
```

### **After Fix:**
```
User clicks "Edit Task" → Success ✅
User changes task status → Success ✅
System updates task → Success ✅
Progress recalculates → Updates everywhere ✅
```

## Testing

After running the SQL:

1. **Go to milestone page**
2. **Click edit on any task**
3. **Change the status or title**
4. **Save**
5. **Should work without errors** ✅

## Impact

This error was blocking:
- ❌ Task editing
- ❌ Task status updates
- ❌ Progress recalculation
- ❌ Milestone updates

After fix:
- ✅ All task operations work
- ✅ Progress updates automatically
- ✅ Status transitions properly
- ✅ No 400 errors

## Summary

**The ambiguous column error prevented any task updates from working.**

**Run `fix_ambiguous_column_error.sql` to fix it!**

This is a critical fix - without it, users can't edit or update tasks. ⚡

