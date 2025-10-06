# Fix Supabase 500 Error - Quick Guide

## Problem
You're getting `500 Internal Server Error` when trying to access the profiles table:
```
GET https://reootcngcptfogfozlmz.supabase.co/rest/v1/profiles?select=full_name&id=eq.xxx 500 (Internal Server Error)
```

This is caused by **Row Level Security (RLS) policies** that are either:
- Causing infinite recursion
- Conflicting with each other
- Blocking legitimate access

## Solution

### Step 1: Run the SQL Fix Script

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a **New Query**
4. Copy and paste the contents of `scripts/fix-rls-500-error.sql`
5. Click **Run** (or press `Ctrl/Cmd + Enter`)

### Step 2: Verify the Fix

After running the script, you should see:
```
✅ RLS policies successfully created!
✅ RLS Policy fix completed! Please test your application now.
```

### Step 3: Test Your Application

1. Clear your browser cache and cookies (or use incognito mode)
2. Try logging in again
3. You should now be able to access the dashboard without 500 errors

## What the Fix Does

The SQL script:
1. ✅ Disables RLS temporarily
2. ✅ Removes ALL existing conflicting policies
3. ✅ Creates 5 new simple, non-recursive policies:
   - Users can view their own profile
   - Users can insert their own profile
   - Users can update their own profile
   - Service role has full access (for admin)
   - Authenticated users can view approved providers
4. ✅ Re-enables RLS
5. ✅ Verifies the policies are working

## Code Changes Made

I've also improved the error handling in your code to prevent infinite retries:

### `hooks/useAuth.ts`
- ✅ Added 3-second timeout to profile fetches
- ✅ Detects 500 errors and logs helpful messages
- ✅ Prevents hanging on failed requests

### `app/dashboard/layout.tsx`
- ✅ Added 3-second timeout to profile fetches
- ✅ Defaults to 'client' role if profile fetch fails (graceful degradation)
- ✅ Added 5-second loading timeout to prevent infinite loading
- ✅ Better error messages in console

## Troubleshooting

### If you still see 500 errors after running the script:

1. **Check Supabase Dashboard → Authentication → Policies**
   - Make sure RLS is enabled for `profiles` table
   - Verify you see the 5 new policies

2. **Check your user's profile exists**
   ```sql
   SELECT * FROM profiles WHERE id = 'your-user-id';
   ```

3. **Check for database constraints**
   ```sql
   SELECT conname, contype 
   FROM pg_constraint 
   WHERE conrelid = 'public.profiles'::regclass;
   ```

4. **Check Supabase logs** (Dashboard → Logs)
   - Look for detailed error messages

### If profile doesn't exist:

You may need to create a profile manually:
```sql
INSERT INTO profiles (id, email, role, full_name, profile_completed, verification_status)
VALUES (
  'your-user-id-from-auth-users',
  'your-email@example.com',
  'client',
  'Your Name',
  true,
  'approved'
);
```

## Prevention

To prevent this issue in the future:
1. ⚠️ Don't create RLS policies that query the same table recursively
2. ⚠️ Test RLS policies in SQL editor before deploying
3. ⚠️ Use simple `auth.uid() = id` checks instead of complex subqueries
4. ✅ Always have a service_role policy for admin access

## Need More Help?

If you're still having issues:
1. Check the browser console for detailed error messages
2. Check Supabase Dashboard → Logs for server-side errors
3. Share the console logs (with the emoji icons 🔍 👤 ✅ ❌) for debugging

## Summary

✅ **Run the SQL script** in `scripts/fix-rls-500-error.sql`  
✅ **Clear browser cache**  
✅ **Try logging in again**  

Your login should now work properly! 🎉

