# Test Script Guide

## 🚨 Current Issue: Table Access Error

The error `relation "milestones" does not exist` occurs when scripts try to access tables that don't exist.

## 🛠️ Available Test Scripts

### 1. **Ultra-Safe Function Test** (Recommended for Missing Tables)
```sql
-- Run this in Supabase SQL editor
\i scripts/ultra-safe-function-test.sql
```

**Features:**
- ✅ Never accesses missing tables
- ✅ Only checks existence via `information_schema`
- ✅ Shows table structure if tables exist
- ✅ Provides clear next steps
- ✅ Safe for any database state

### 2. **Safe Function Test** (Fixed Version)
```sql
-- Run this in Supabase SQL editor
\i scripts/safe-function-test.sql
```

**Features:**
- ✅ Handles missing tables with try/catch
- ✅ Tests functions if tables exist
- ✅ More comprehensive testing
- ✅ May still fail if tables are completely missing

### 3. **Test Ambiguous Column Fix**
```sql
-- Run this in Supabase SQL editor
\i scripts/test-ambiguous-column-fix.sql
```

**Features:**
- ✅ Tests the variable naming fix
- ✅ Verifies no ambiguous column errors
- ✅ Shows all tables and functions

## 🎯 Which Script to Use

### **If You Get "relation does not exist" Error:**
```sql
-- Use the ultra-safe version
\i scripts/ultra-safe-function-test.sql
```

### **If Tables Exist But Functions Don't:**
```sql
-- Use the safe version
\i scripts/safe-function-test.sql
```

### **If Everything Exists:**
```sql
-- Use any version
\i scripts/safe-function-test.sql
```

## 📋 Expected Results

### **Ultra-Safe Script Results:**
```
🔍 Checking required tables...
❌ Table bookings missing
❌ Table milestones missing
❌ Table tasks missing
⚠️ Missing tables: bookings, milestones, tasks
💡 Run migration 161 to create missing tables

🔍 Checking required functions...
❌ Function calculate_booking_progress missing
❌ Function update_milestone_progress missing
❌ Function update_task missing
⚠️ Missing functions: calculate_booking_progress, update_milestone_progress, update_task
💡 Run migration 160 to create missing functions

📋 Summary:
   - Tables: 0/4 exist
   - Functions: 0/3 exist
⚠️ Both tables and functions are missing. Run both migrations:
   - supabase migration up 161 (for tables)
   - supabase migration up 160 (for functions)
```

### **After Running Migrations:**
```
🔍 Checking required tables...
✅ Table bookings exists
✅ Table milestones exists
✅ Table tasks exists
✅ Table progress_logs exists
✅ All required tables exist

🔍 Checking required functions...
✅ Function calculate_booking_progress exists
✅ Function update_milestone_progress exists
✅ Function update_task exists
✅ All required functions exist

📋 Summary:
   - Tables: 4/4 exist
   - Functions: 3/3 exist
🎉 All required components exist! You can now test the functions.
```

## 🚀 Quick Setup Process

### **Step 1: Check Current State**
```sql
-- Run the ultra-safe test
\i scripts/ultra-safe-function-test.sql
```

### **Step 2: Create Tables (if missing)**
```bash
supabase migration up 161
```

### **Step 3: Create Functions (if missing)**
```bash
supabase migration up 160
```

### **Step 4: Verify Everything Works**
```sql
-- Run the safe test
\i scripts/safe-function-test.sql
```

## 🔧 Troubleshooting

### **If Ultra-Safe Script Fails:**
- Check your database connection
- Verify you're in the correct schema
- Check Supabase dashboard for errors

### **If Migrations Fail:**
```bash
# Check migration status
supabase migration list

# Apply specific migration
supabase migration up 161

# Or apply all migrations
supabase db push
```

### **If Functions Still Don't Work:**
```sql
-- Check function existence
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_booking_progress', 'update_milestone_progress', 'update_task');
```

## 💡 Pro Tips

1. **Always start with ultra-safe script** to avoid errors
2. **Check the summary section** for clear next steps
3. **Run migrations in order** (161 for tables, 160 for functions)
4. **Use safe script for testing** after everything exists

The ultra-safe script is your best friend when dealing with missing tables! 🎉
