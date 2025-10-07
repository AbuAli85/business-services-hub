# 🎯 Which SQL Script Should You Run?

## Quick Guide - Pick One Script

You're getting database errors. Here's which script to run based on your situation:

---

## 🏆 **RECOMMENDED FOR EVERYONE**

### **`scripts/safest-setup-task-tables.sql`**

✅ **Run this one if you're unsure!**

**Why?**
- Handles ALL edge cases
- Cleans existing data
- Creates missing tables
- Adds missing columns
- Fixes constraint violations
- Safe to run multiple times
- Won't break existing data

**When to use:**
- ✅ First time setup
- ✅ Getting any database errors
- ✅ Want to ensure everything is correct
- ✅ Not sure what's wrong

**Time:** 30 seconds

---

## 🔧 **SPECIFIC FIX SCRIPTS**

Use these only if you want to fix one specific issue:

### **1. Missing parent_id Column**

**Error:** `column "parent_id" does not exist`  
**Script:** `scripts/fix-task-comments-add-parent-id.sql`  
**What it does:** Adds just the parent_id column  
**Time:** 10 seconds

---

### **2. Check Constraint Violation**

**Error:** `check constraint "task_comments_comment_type_check" is violated`  
**Script:** `scripts/fix-task-comments-constraint-violation.sql`  
**What it does:** Cleans invalid comment_type values and adds constraint  
**Time:** 10 seconds

---

### **3. Missing Tables**

**Error:** `relation "public.task_approvals" does not exist`  
**Script:** `scripts/create-task-comments-files-approvals-tables.sql`  
**What it does:** Creates all 3 tables from scratch  
**Time:** 30 seconds  
**Note:** Use `safest-setup-task-tables.sql` instead if tables already exist

---

## 📊 Comparison Table

| Script | Creates Tables | Adds Columns | Cleans Data | Safe to Re-run |
|--------|----------------|--------------|-------------|----------------|
| **safest-setup-task-tables.sql** | ✅ | ✅ | ✅ | ✅ |
| safe-setup-task-tables.sql | ✅ | ✅ | ❌ | ✅ |
| create-task-comments-files-approvals-tables.sql | ✅ | ✅ | ❌ | ⚠️ |
| fix-task-comments-add-parent-id.sql | ❌ | ✅ | ❌ | ✅ |
| fix-task-comments-constraint-violation.sql | ❌ | ❌ | ✅ | ✅ |

---

## 🎯 Decision Flow

```
Do you have ANY database errors?
├─ YES → Run: safest-setup-task-tables.sql
└─ NO → You're all set! 🎉

Do you just want to ensure everything is correct?
└─ YES → Run: safest-setup-task-tables.sql

Do you want to fix ONE specific error?
├─ Missing parent_id → fix-task-comments-add-parent-id.sql
├─ Constraint violation → fix-task-comments-constraint-violation.sql
└─ Missing tables → safest-setup-task-tables.sql
```

---

## 🚀 How to Run Any Script

### **Method 1: Via Supabase Dashboard (Easy)**

1. Open the script file in your IDE
2. Select all (Ctrl+A)
3. Copy (Ctrl+C)
4. Go to [Supabase Dashboard](https://app.supabase.com)
5. Select your project
6. Click **SQL Editor** (left sidebar)
7. Click **New Query**
8. Paste (Ctrl+V)
9. Click **Run** ▶️ (or Ctrl+Enter)
10. Wait for success messages
11. Refresh your app

---

### **Method 2: Via Supabase CLI (Advanced)**

```bash
# If you have Supabase CLI installed
supabase db push --db-url "your-db-url" < scripts/safest-setup-task-tables.sql
```

---

## ✅ What Success Looks Like

After running the script, you should see:

```
✅ SETUP COMPLETE - ALL TABLES READY!
✅ task_comments - Ready
✅ task_files - Ready
✅ task_approvals - Ready
✅ Storage bucket - Ready
✅ RLS policies - Applied
✅ Indexes - Created
✅ Triggers - Active
🎉 You can now refresh your app!
```

---

## 🧪 Test After Running Script

1. **Refresh your app** (F5 or Ctrl+R)
2. Go to **Dashboard → Bookings → [Select booking] → Milestones**
3. Look at tasks - should see:
   - 💬 Comment icon with badge count
   - 📎 File icon with badge count
4. Click 💬 icon → Should open comments dialog
5. Add a test comment → Should save successfully
6. Click 📎 icon → Should open files dialog
7. Upload a test file → Should upload successfully

---

## 🆘 Still Having Issues?

### **If script fails:**
1. Check you're logged in as database owner
2. Verify tasks and profiles tables exist
3. Check error message in console
4. Try running `safest-setup-task-tables.sql`

### **If app still shows errors:**
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check browser console for errors
4. Verify you're logged in

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `WHICH_SCRIPT_TO_RUN.md` | ← You are here! |
| `COMMENTS_AND_FILES_SYSTEM_GUIDE.md` | Complete feature documentation |
| `SETUP_TASK_TABLES_INSTRUCTIONS.md` | Detailed setup guide |
| `FIX_PARENT_ID_ERROR.md` | Fix parent_id column issue |
| `FIX_CONSTRAINT_VIOLATION.md` | Fix constraint violation issue |
| `QUICK_FIX_DATABASE_ERROR.md` | Quick reference |

---

## 🎯 TL;DR - Just Tell Me What to Do!

1. **Open:** `scripts/safest-setup-task-tables.sql`
2. **Copy:** All the code (Ctrl+A, Ctrl+C)
3. **Go to:** Supabase Dashboard → SQL Editor
4. **Paste:** The code (Ctrl+V)
5. **Run:** Click the play button ▶️
6. **Refresh:** Your app (F5)
7. **Test:** Add a comment or upload a file

✅ **Done!** That's it!

---

## 🏁 Summary

**Best Choice for 99% of Cases:**
```
scripts/safest-setup-task-tables.sql
```

**Why?**
- Handles everything
- Safe and reliable
- One script does it all
- No guessing needed

**👉 Just run that script and you're done!** 🎉

