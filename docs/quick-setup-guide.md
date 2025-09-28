# Quick Setup Guide

## 🚨 Current Issue: Missing Tables

The error `relation "milestones" does not exist` means your database is missing the required tables.

## 🛠️ Quick Fix

### Step 1: Create Missing Tables
```bash
# Apply the table creation migration
supabase migration up 161
```

### Step 2: Test Functions Safely
```sql
-- Run this in Supabase SQL editor
\i scripts/safe-function-test.sql
```

## 📋 What This Does

### Migration 161 Creates:
- ✅ `bookings` table
- ✅ `milestones` table  
- ✅ `tasks` table
- ✅ `progress_logs` table (optional)
- ✅ Indexes for performance
- ✅ RLS policies for security
- ✅ Proper permissions

### Safe Test Script:
- 🔍 Checks if tables exist
- 🔍 Checks if functions exist
- ✅ Tests functions only if tables are available
- ⚠️ Provides helpful error messages
- 💡 Suggests fixes for missing components

## 🚀 Complete Setup Process

### Option 1: Full Setup (Recommended)
```bash
# 1. Create tables
supabase migration up 161

# 2. Create functions (if not done already)
supabase migration up 160

# 3. Test everything
# Run in Supabase SQL editor:
\i scripts/safe-function-test.sql
```

### Option 2: Just Test What Exists
```sql
-- Run this in Supabase SQL editor
\i scripts/safe-function-test.sql
```

## ✅ Expected Results

### After Migration 161:
```
✅ Table bookings exists
✅ Table milestones exists
✅ Table tasks exists
✅ Table progress_logs exists
Created 4 out of 4 required tables
```

### After Safe Test:
```
✅ Function calculate_booking_progress exists
✅ Function update_milestone_progress exists
✅ Function update_task exists
📊 Found X bookings, Y milestones, Z tasks
✅ All functions work correctly
```

## 🔧 Troubleshooting

### If Migration Fails:
```bash
# Check migration status
supabase migration list

# Apply specific migration
supabase migration up 161

# Or apply all migrations
supabase db push
```

### If Functions Still Don't Work:
```bash
# Apply function cleanup migration
supabase migration up 160

# Then test again
\i scripts/safe-function-test.sql
```

### If Tables Still Missing:
```sql
-- Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

## 🎯 Next Steps

1. **Run Migration 161** to create tables
2. **Run Safe Test Script** to verify everything works
3. **Test with Real Data** if you have bookings/milestones/tasks
4. **Check API Integration** if needed

The safe test script will tell you exactly what's missing and how to fix it! 🎉
