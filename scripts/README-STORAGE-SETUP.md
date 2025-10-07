# 🚀 Storage Setup Scripts

Quick guide to setting up file uploads in your application.

---

## ⚡ **Option 1: Run ONE Script (Recommended)**

**Just run this one script in Supabase SQL Editor:**

```sql
-- File: COMPLETE-SETUP-STORAGE.sql
-- Does everything: buckets + policies + database fixes
```

### **Steps:**
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy entire contents of `COMPLETE-SETUP-STORAGE.sql`
3. Paste and click **"Run"**
4. ✅ Done! (If successful)

---

## ⚠️ **If You Get Permission Error:**

Error: `"must be owner of table objects"`

**This means:** SQL Editor doesn't have permission to create storage policies.

**Solution:** Use the UI instead (takes 5 minutes)

### **Steps:**
1. Run `COMPLETE-SETUP-STORAGE.sql` anyway (creates buckets + fixes database)
2. Follow guide in `UI-POLICY-GUIDE.md` to add policies via UI
3. Or watch this video: [Supabase Storage Policies](https://supabase.com/docs/guides/storage)

---

## 📁 **Available Scripts:**

| Script | What It Does | When to Use |
|--------|-------------|-------------|
| `COMPLETE-SETUP-STORAGE.sql` | **Everything at once** | ⭐ Use this first! |
| `create-all-storage-buckets.sql` | Creates 3 buckets only | If you only need buckets |
| `create-all-storage-policies.sql` | Creates all policies only | If buckets exist but no policies |
| `fix-task-comments-complete.sql` | Fixes task_comments table | If getting comment errors |
| `UI-POLICY-GUIDE.md` | Manual UI instructions | If SQL fails due to permissions |

---

## ✅ **What Gets Created:**

### **Storage Buckets:**
- `booking-files` - For booking attachments
- `task-files` - For task/milestone files
- `milestone-files` - For deliverables

### **Storage Policies (12 total):**
- **INSERT** policies - Authenticated users can upload
- **SELECT** policies - Public can read/download
- **DELETE** policies - Authenticated users can delete
- **UPDATE** policies - Authenticated users can update

### **Database Fixes:**
- `task_comments.comment_type` column
- `task_comments.created_by` column
- `task_comments.updated_at` column
- Indexes for performance
- Auto-update trigger

---

## 🧪 **Testing After Setup:**

1. **Refresh your browser**
2. Go to any page with file upload:
   - Bookings → Files
   - Tasks → Attachments
   - Milestones → Deliverables
3. Try uploading a file
4. Should work! ✅

---

## 🆘 **Troubleshooting:**

### **Error: "Bucket not found"**
→ Run `create-all-storage-buckets.sql`

### **Error: "new row violates row-level security policy"**
→ Storage policies missing. Use `UI-POLICY-GUIDE.md`

### **Error: "Could not find the 'created_by' column"**
→ Run `fix-task-comments-complete.sql`

### **Error: "must be owner of table objects"**
→ Use UI to add policies. See `UI-POLICY-GUIDE.md`

---

## 📊 **Current Status Check:**

Run this query to see what's already created:

```sql
-- Check buckets
SELECT id, name, public, file_size_limit, created_at
FROM storage.buckets
WHERE id IN ('booking-files', 'task-files', 'milestone-files');

-- Check policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND (policyname LIKE '%booking%' OR policyname LIKE '%task%' OR policyname LIKE '%milestone%');

-- Check task_comments columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'task_comments'
  AND column_name IN ('comment_type', 'created_by', 'updated_at');
```

---

## 🎯 **Quick Checklist:**

- [ ] Buckets created (3 total)
- [ ] Policies created (12 total - 4 per bucket)
- [ ] task_comments table fixed
- [ ] Browser refreshed
- [ ] File upload tested

---

**Need help? See `UI-POLICY-GUIDE.md` for manual setup instructions.**



