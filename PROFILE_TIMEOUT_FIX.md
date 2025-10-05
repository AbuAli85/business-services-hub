# Profile Query Timeout Fix

## Errors Identified

### **Error 1: 500 Internal Server Error**
```
GET .../profiles?select=id,full_name,avatar_url,role&id=in.(4fedc90a-...)
Status: 500 (Internal Server Error)
```

### **Error 2: Statement Timeout**
```
Error fetching participants: {
  code: '57014',
  message: 'canceling statement due to statement timeout'
}
```

## Root Cause

The `profiles` table queries are timing out because:

1. **Missing Indexes** - Queries scan entire table
2. **Complex RLS Policies** - Row Level Security slowing queries
3. **Large Table** - Many profile records to scan
4. **Default Timeout** - PostgreSQL default is too short (15 seconds)

## Solution

### **Created:** `fix_profile_query_timeout.sql`

This script:

1. ✅ **Adds Performance Indexes**
   ```sql
   CREATE INDEX idx_profiles_id_name ON profiles(id, full_name);
   CREATE INDEX idx_profiles_id_avatar ON profiles(id, avatar_url);
   CREATE INDEX idx_profiles_id_role ON profiles(id, role);
   CREATE INDEX idx_profiles_lookup ON profiles(id, full_name, avatar_url, role);
   ```

2. ✅ **Updates Table Statistics**
   ```sql
   ANALYZE public.profiles;
   VACUUM ANALYZE public.profiles;
   ```

3. ✅ **Checks Primary Key**
   ```sql
   ALTER TABLE profiles ADD PRIMARY KEY (id);
   ```

4. ✅ **Shows RLS Policies**
   - Identifies slow policies
   - Helps optimize security rules

## How to Apply

### **Run in Supabase SQL Editor:**

1. Copy contents of `fix_profile_query_timeout.sql`
2. Paste into SQL Editor
3. Run the script
4. Indexes will be created (takes a few seconds)
5. Table will be optimized

## Expected Results

### **Before:**
```
Query time: 15+ seconds → TIMEOUT
Error: 500 Internal Server Error
Profile data: Failed to load
```

### **After:**
```
Query time: <1 second ✅
Status: 200 OK ✅
Profile data: Loaded successfully ✅
```

## Impact on Application

### **Current Impact:**
- ❌ Participant lists fail to load
- ❌ Profile avatars don't show
- ❌ User names show as "Client (abc...)" 
- ❌ 500 errors in console
- ❌ Poor user experience

### **After Fix:**
- ✅ Participant lists load instantly
- ✅ Profile avatars display
- ✅ User names show correctly
- ✅ No errors in console
- ✅ Fast, smooth experience

## Additional Recommendations

### **1. Simplify RLS Policies**

If RLS policies are complex, consider:
```sql
-- Check current policies
SELECT policyname, qual FROM pg_policies WHERE tablename = 'profiles';

-- Simplify if needed (example)
DROP POLICY IF EXISTS complex_policy ON profiles;
CREATE POLICY simple_policy ON profiles
  FOR SELECT USING (auth.uid() = id OR auth.role() = 'admin');
```

### **2. Add Query Timeout Protection**

Already implemented in the code:
```typescript
// 5 second timeout for profile queries
const profileController = new AbortController()
const profileTimeout = setTimeout(() => profileController.abort(), 5000)
```

### **3. Use Connection Pooling**

Supabase handles this automatically, but ensure:
- Not opening too many connections
- Closing connections properly
- Using connection pool limits

## Testing

After running the SQL:

1. **Refresh browser** (Ctrl + F5)
2. **Check console** - Should see:
   ```
   ✅ Profile data loaded
   ✅ No timeout errors
   ```
3. **Verify UI** - Names and avatars display
4. **Check network tab** - Profile queries < 1 second

## Monitoring

Check query performance:
```sql
-- Check slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%profiles%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Summary

**The profile timeout errors are separate from the milestone system.**

To fix:
1. ✅ Run `fix_profile_query_timeout.sql` - Adds indexes
2. ✅ Hard refresh browser - Clears cache
3. ✅ Test profile loading - Should be fast now

**Run the SQL script to fix the timeout issues!** ⚡✨

