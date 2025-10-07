# 🔧 Fix "Permission Denied for Table task_files" Error

## Problem

You're getting this error when trying to access the `task_files` table:

```json
{
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "permission denied for table task_files"
}
```

## Solution

The table exists but is missing GRANT permissions for authenticated users. Here's how to fix it:

---

## Quick Fix (2 Minutes)

### Option 1: Supabase Dashboard (Recommended) ✅

1. **Open Supabase Dashboard**
   - Go to your project at [supabase.com](https://supabase.com)

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Copy and Run the Fix Script**
   - Open the file: `scripts/fix-task-files-permissions.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **"Run"** button

4. **Verify Success**
   - You should see success messages in the output
   - Look for: ✅ TASK_FILES PERMISSIONS FIXED!

5. **Test Your Application**
   - Refresh your app
   - Try uploading a file again
   - The error should be gone! 🎉

---

### Option 2: Command Line (Alternative)

If you have `psql` installed:

```bash
# Navigate to scripts directory
cd scripts

# Run the fix script
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f fix-task-files-permissions.sql
```

Replace:
- `[YOUR-PASSWORD]` with your database password
- `[YOUR-PROJECT-REF]` with your project reference

---

## What This Fix Does

The script will:

1. ✅ **Grant table permissions** to authenticated users
   - SELECT (view files)
   - INSERT (upload files)
   - UPDATE (edit files)
   - DELETE (remove files)

2. ✅ **Enable Row Level Security** (RLS)
   - Ensures data security

3. ✅ **Create RLS policies**
   - All users can view task files
   - All users can upload files
   - Users can only edit/delete their own files

4. ✅ **Verify everything works**
   - Shows status of grants and policies

---

## After Running the Script

You should see output like:

```
========================================================================
✅ TASK_FILES PERMISSIONS FIXED!
========================================================================

📊 Status:
   • Table grants: 4 permissions granted
   • RLS policies: 4 policies created
   • RLS enabled: ✅ YES

✅ Permissions granted:
   • SELECT (view files)
   • INSERT (upload files)
   • UPDATE (edit own files)
   • DELETE (delete own files)

🔒 Security policies:
   • All users can view task files
   • All users can upload task files
   • Users can only update their own files
   • Users can only delete their own files

========================================================================
🚀 The "permission denied" error should now be fixed!
========================================================================
```

---

## Verify the Fix

### Test in Your App

1. Try uploading a file to a task
2. The error should be gone
3. File should upload successfully

### Check in Database (Optional)

Run this query in SQL Editor to verify:

```sql
-- Check permissions
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'task_files'
  AND grantee = 'authenticated';

-- Should show:
-- authenticated | SELECT
-- authenticated | INSERT
-- authenticated | UPDATE
-- authenticated | DELETE
```

---

## Still Having Issues?

### Common Problems

**Problem 1: "Table task_files does not exist"**

**Solution:** Run the table creation script first:
```bash
# In Supabase SQL Editor
-- Run: scripts/create-task-files-table.sql
```

**Problem 2: "Must be owner of table"**

**Solution:** 
- Make sure you're running in Supabase Dashboard (not as regular user)
- Or use the service_role key in your connection string

**Problem 3: Still getting permission error**

**Solution:**
1. Clear your browser cache
2. Restart your development server
3. Sign out and sign back in to your app
4. Check if you're using the correct Supabase client

---

## Files Involved

- **Fix Script**: `scripts/fix-task-files-permissions.sql` ← Run this
- **Table Creation**: `scripts/create-task-files-table.sql` (if needed)
- **Storage Policies**: `scripts/create-all-storage-policies.sql` (separate issue)

---

## Security Notes

✅ **What's Secure:**
- Users can only edit/delete their own files
- RLS policies enforce data isolation
- All operations require authentication

✅ **What's Open:**
- All authenticated users can view all task files
- All authenticated users can upload files

💡 **To Make More Restrictive:**
If you want to limit file access to only task participants, modify the policies:

```sql
-- Example: Only let users see files from their tasks
CREATE POLICY "Users can view task files"
ON task_files FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_files.task_id
    AND (
      t.assigned_to = auth.uid()
      OR t.created_by = auth.uid()
    )
  )
);
```

---

## Quick Reference

| Action | Permission Needed | Who Can Do It |
|--------|------------------|---------------|
| View files | SELECT | All authenticated users |
| Upload files | INSERT | All authenticated users |
| Edit file metadata | UPDATE | File uploader only |
| Delete files | DELETE | File uploader only |

---

## Summary

1. ✅ Open Supabase Dashboard → SQL Editor
2. ✅ Copy and run `scripts/fix-task-files-permissions.sql`
3. ✅ Look for success message
4. ✅ Test your app - error should be gone!

**Total time:** ~2 minutes ⏱️

---

**Need help?** Check the script output for detailed status messages!



