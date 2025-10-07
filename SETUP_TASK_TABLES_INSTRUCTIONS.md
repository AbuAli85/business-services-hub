# 🚀 Setup Instructions - Task Comments & Files Tables

## ⚠️ Problem

You're seeing this error:
```json
{
    "code": "42P01",
    "message": "relation \"public.task_approvals\" does not exist"
}
```

This means the required database tables haven't been created yet.

---

## ✅ Solution - Run the SQL Migration Script

### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### **Step 2: Run the Migration Script**

1. Open the file: `scripts/create-task-comments-files-approvals-tables.sql`
2. Copy **ALL** the SQL code
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### **Step 3: Verify Success**

You should see output like:
```
✅ All tables, indexes, RLS policies, and storage bucket created successfully!
📝 task_comments - Ready for use
📎 task_files - Ready for use
✔️ task_approvals - Ready for use
🗄️ Storage bucket "task-files" - Ready for use
```

---

## 📋 What Gets Created

The script will create:

### **1. Three Database Tables:**
- ✅ `task_comments` - Store comments on tasks
- ✅ `task_files` - Store uploaded files metadata
- ✅ `task_approvals` - Store client approvals

### **2. Indexes:**
- Performance indexes on all foreign keys
- Indexes on created_at for sorting
- Indexes on commonly queried fields

### **3. RLS Policies:**
- Security policies so users can only see/edit their own data
- Proper access control based on booking ownership

### **4. Storage Bucket:**
- `task-files` bucket for file uploads
- 10MB file size limit
- Allowed file types: images, PDFs, documents

### **5. Triggers:**
- Auto-update `updated_at` timestamps

---

## 🔍 Verify Tables Were Created

Run this query in Supabase SQL Editor:

```sql
-- Check if all tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('task_comments', 'task_files', 'task_approvals')
ORDER BY table_name;

-- Should return 3 rows (one for each table)
```

---

## 🧪 Test After Setup

1. **Refresh your application** (Ctrl+F5 or Cmd+Shift+R)
2. Go to **Dashboard → Bookings → Select a booking → Milestones**
3. Click on a task's **💬 comment icon**
   - You should see an empty comments dialog (no errors)
4. Click on a task's **📎 file icon**
   - You should see an empty files dialog (no errors)
5. Try adding a comment
   - Should save successfully
6. Try uploading a file
   - Should upload successfully

---

## 🔧 Already Fixed in Code

The `improved-milestone-system.tsx` component has been updated to:
- ✅ Handle missing tables gracefully
- ✅ Show warnings in console instead of breaking
- ✅ Continue loading even if one query fails
- ✅ Default to empty arrays if data can't be loaded

So if you haven't run the SQL script yet, the app will still work (just won't show comments/files).

---

## 📊 Table Schema Reference

### **task_comments**
```sql
id              UUID PRIMARY KEY
task_id         UUID (FK to tasks)
content         TEXT
comment_type    VARCHAR(20) -- 'general', 'feedback', 'question', 'issue'
created_by      UUID (FK to profiles)
parent_id       UUID (FK to task_comments) -- for replies
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### **task_files**
```sql
id              UUID PRIMARY KEY
task_id         UUID (FK to tasks)
file_name       VARCHAR(255)
original_name   VARCHAR(255)
file_size       BIGINT
file_type       VARCHAR(100)
file_url        TEXT
description     TEXT
category        VARCHAR(50) -- 'documents', 'images', etc.
uploaded_by     UUID (FK to profiles)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### **task_approvals**
```sql
id              UUID PRIMARY KEY
task_id         UUID (FK to tasks)
action          VARCHAR(20) -- 'approve', 'reject', 'request_revision'
feedback        TEXT
approved_by     UUID (FK to profiles)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

---

## 🆘 Troubleshooting

### **Error: "permission denied for schema public"**
**Solution**: Make sure you're logged in as the database owner or have proper permissions.

### **Error: "relation 'tasks' does not exist"**
**Solution**: The `tasks` table must exist first. Run your main migrations first.

### **Error: "relation 'profiles' does not exist"**
**Solution**: The `profiles` table must exist first. This should be created during Supabase auth setup.

### **Storage bucket creation fails**
**Solution**: 
1. Go to Supabase Dashboard → Storage
2. Manually create a bucket called `task-files`
3. Set it to **Public**
4. Set size limit to 10MB

### **RLS policies not working**
**Solution**: 
1. Make sure RLS is enabled on all tables
2. Verify policies are created (check `pg_policies` table)
3. Test with authenticated user (not anonymous)

---

## ✨ What to Expect After Setup

After running the SQL script and refreshing your app:

✅ **Comment icons show counts** (e.g., 💬 3)  
✅ **File icons show counts** (e.g., 📎 2)  
✅ **Click comment icon → see all comments**  
✅ **Click file icon → see all files**  
✅ **Add new comment → appears immediately**  
✅ **Upload file → appears immediately**  
✅ **Download/view files works**  

---

## 📞 Need Help?

If you're still having issues after running the script:

1. Check browser console for errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify all tables were created
4. Check RLS policies are enabled
5. Make sure you're authenticated

---

## 🎉 Success!

Once the script runs successfully:
- ✅ Error will disappear
- ✅ Comments system fully functional
- ✅ File upload system fully functional
- ✅ All badges and counts working

**Run the SQL script now to fix the error!**

