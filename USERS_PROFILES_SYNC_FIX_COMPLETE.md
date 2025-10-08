# Users & Profiles Sync - Complete Fix

## Problem Analysis

The redirect issue when clicking "New Service" is caused by a **role mismatch** between `auth.users` and `profiles` tables.

### Root Cause

1. **Two Sources of Truth**: The system stores user roles in TWO places:
   - `auth.users.raw_user_meta_data.role` (Supabase auth metadata)
   - `profiles.role` (Application database)

2. **Sync Issues**: When these don't match, the `RoleGuard` component:
   - Checks if `auth.users.raw_user_meta_data.role` OR `profiles.role` is 'provider'
   - If NEITHER matches 'provider', it redirects to `/dashboard`

3. **Common Scenarios**:
   - User signed up as 'client' but needs to be 'provider'
   - Role exists in one table but not the other
   - Roles exist but don't match

## Database Schema

### auth.users (Supabase Auth)
```sql
- id (UUID, primary key)
- email (TEXT)
- raw_user_meta_data (JSONB) {
    "role": "provider" | "client" | "admin" | "staff",
    "full_name": "...",
    "phone": "...",
    "company_name": "..."
  }
```

### profiles (Application Table)
```sql
- id (UUID, references auth.users.id)
- role (user_role ENUM: 'admin' | 'provider' | 'client' | 'staff')
- email (TEXT)
- full_name (TEXT)
- phone (TEXT)
- company_name (TEXT)
- profile_completed (BOOLEAN)
- verification_status (TEXT)
```

## Solution Overview

I've created 3 SQL scripts to fix this:

### 1. `fix_users_profiles_sync.sql` (MAIN FIX)

**What it does:**
- ✅ Creates missing profiles for all auth.users
- ✅ Syncs roles from auth.users to profiles
- ✅ Syncs roles from profiles to auth.users (where missing)
- ✅ Creates trigger to keep roles in sync automatically
- ✅ Shows detailed before/after comparison

**When to use:** Run this ONCE to fix all users in the system

### 2. `check_my_user_role.sql` (DIAGNOSTIC)

**What it does:**
- ✅ Shows your user's current role status
- ✅ Identifies if there's a mismatch
- ✅ Has quick fix section (commented out) for your specific user

**When to use:** Run this FIRST to check if you need the fix

### 3. Debug Page: `/dashboard/debug-role` (BROWSER-BASED)

**What it does:**
- ✅ Shows your role information in the browser
- ✅ No SQL needed - just navigate to the page
- ✅ Copy-paste friendly output

**When to use:** If you prefer browser-based debugging

## Step-by-Step Fix Instructions

### Step 1: Check Your Current Role

**Option A: Browser (Easiest)**
1. Navigate to: `http://localhost:3000/dashboard/debug-role` (or your domain)
2. Look at "Profile Role" - what does it say?
3. Screenshot or copy the output

**Option B: SQL**
1. Open Supabase SQL Editor
2. Run `check_my_user_role.sql`
3. Replace `'your-email@example.com'` with your actual email
4. Check the output

### Step 2: Interpret Results

**If Profile Role shows "provider" or "admin":**
- ✅ Your role is correct
- The redirect issue might be caused by something else
- Check browser console for RoleGuard logs

**If Profile Role shows "client" or something else:**
- ❌ This is the problem!
- Your account needs to be changed to 'provider'
- Continue to Step 3

**If Profile is missing:**
- ❌ Critical issue
- Run the full sync script immediately
- Continue to Step 3

### Step 3: Run the Fix

**In Supabase SQL Editor:**

```sql
-- Run the comprehensive fix
\i fix_users_profiles_sync.sql

-- Or copy-paste the entire content of fix_users_profiles_sync.sql
-- into the SQL Editor and click "Run"
```

**What to expect:**
- Script will show progress with ✅ and ❌ symbols
- It will create missing profiles
- It will sync all roles
- It will show before/after comparison
- Takes 5-30 seconds depending on user count

### Step 4: Verify the Fix

**Run check_my_user_role.sql again:**
- Profile Role should now show "provider"
- Status should show "✅ PROVIDER ROLE"
- Can_create_services should show "✅ YES"

### Step 5: Test in Browser

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Sign out completely**
3. **Sign back in**
4. Navigate to My Services
5. Click "New Service"
6. Should navigate directly to Create Service page ✅

## Quick Fix (For Your User Only)

If you just want to fix YOUR account quickly:

### In SQL Editor:

```sql
-- Replace 'your@email.com' with your actual email
UPDATE profiles
SET role = 'provider'
WHERE email = 'your@email.com';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'provider')
WHERE email = 'your@email.com';
```

Then:
1. Sign out
2. Clear cache
3. Sign back in
4. Try "New Service" again

## What the Trigger Does

The script creates a trigger that automatically:
- Watches for role changes in `profiles` table
- Updates `auth.users.raw_user_meta_data.role` to match
- Keeps both tables in sync going forward
- Prevents future mismatches

```sql
-- The trigger function
CREATE TRIGGER sync_profile_role_trigger
    AFTER INSERT OR UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_role_to_auth();
```

## Verification Queries

### Check all users and their roles:
```sql
SELECT 
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role,
    CASE 
        WHEN (au.raw_user_meta_data->>'role') = p.role::text THEN '✅ Match'
        ELSE '❌ Mismatch'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id;
```

### Check specific user by email:
```sql
SELECT * FROM get_user_with_role(
    (SELECT id FROM auth.users WHERE email = 'your@email.com')
);
```

## Troubleshooting

### Issue: "Still getting redirected after fix"
**Solution:**
1. Clear browser cache completely
2. Sign out and sign back in
3. Check browser console for RoleGuard logs
4. Verify role with `check_my_user_role.sql`

### Issue: "Profile role is correct but still redirected"
**Solution:**
1. Check auth.users metadata role:
   ```sql
   SELECT raw_user_meta_data->>'role' 
   FROM auth.users 
   WHERE email = 'your@email.com';
   ```
2. If it doesn't match, run sync script again

### Issue: "Can't run SQL scripts"
**Solution:**
1. Use the browser debug page: `/dashboard/debug-role`
2. Or manually update in Supabase Dashboard → Authentication → Users
3. Click your user → "User Metadata" → Add/edit `role: provider`

## Files Created

1. ✅ `fix_users_profiles_sync.sql` - Comprehensive sync script
2. ✅ `check_my_user_role.sql` - User role checker
3. ✅ `app/dashboard/debug-role/page.tsx` - Browser-based debug page
4. ✅ `USERS_PROFILES_SYNC_FIX_COMPLETE.md` - This documentation
5. ✅ `CREATE_SERVICE_REDIRECT_SOLUTION.md` - Original issue documentation
6. ✅ `URGENT_FIX_CREATE_SERVICE_REDIRECT.md` - Quick fix guide
7. ✅ `DEBUG_CREATE_SERVICE_REDIRECT.md` - Debug instructions

## Summary

The redirect issue is caused by role mismatches between `auth.users` and `profiles` tables. The fix ensures:

1. ✅ All auth.users have corresponding profiles
2. ✅ All roles are synced between both tables
3. ✅ Future changes stay in sync automatically
4. ✅ RoleGuard can verify user is 'provider'
5. ✅ User can access Create Service page

Run the scripts, sign out, sign back in, and you should be good to go! 🚀

