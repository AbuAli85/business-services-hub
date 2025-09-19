# Critical Fixes Summary

## Issues Identified

1. **CSP Violation**: `vercel.live` script blocked by Content Security Policy
2. **500 Internal Server Error**: Multiple Supabase REST API calls failing
3. **RLS Policy Infinite Recursion**: "infinite recursion detected in policy for relation 'profiles'"

## Fixes Applied

### 1. CSP Fix (✅ Applied)

**File**: `middleware.ts`
**Change**: Added `https://vercel.live` to the `script-src` directive

```typescript
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  'https://js.hcaptcha.com',
  'https://challenges.hcaptcha.com',
  'https://vercel.live'  // ← Added this
].join(' ')
```

### 2. RLS Policy Fixes (📋 Ready to Apply)

Created migration files to fix infinite recursion in RLS policies:

#### `supabase/migrations/073_fix_rls_infinite_recursion.sql`
- Drops all existing policies on `profiles` table
- Creates simple, non-recursive policies
- Fixes the infinite recursion issue

#### `supabase/migrations/074_fix_notifications_rls.sql`
- Fixes RLS policies for `notifications` table
- Ensures users can only access their own notifications

#### `supabase/migrations/075_fix_companies_rls.sql`
- Fixes RLS policies for `companies` table
- Ensures users can only access their own companies

#### `supabase/migrations/076_fix_bookings_rls.sql`
- Fixes RLS policies for `bookings` table
- Ensures users can only access their own bookings

### 3. Testing Script (✅ Created)

**File**: `scripts/test-api-endpoints.js`
- Tests all API endpoints after fixes are applied
- Helps verify that RLS policies are working correctly

## How to Apply the Fixes

### Option 1: Using Supabase CLI (Recommended)

1. **Start Supabase locally** (requires Docker Desktop):
   ```bash
   npx supabase start
   ```

2. **Apply migrations**:
   ```bash
   npx supabase db push
   ```

3. **Test the fixes**:
   ```bash
   node scripts/test-api-endpoints.js
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order:
   - `073_fix_rls_infinite_recursion.sql`
   - `074_fix_notifications_rls.sql`
   - `075_fix_companies_rls.sql`
   - `076_fix_bookings_rls.sql`

### Option 3: Manual SQL Execution

If you prefer to run the SQL manually, here's the consolidated fix:

```sql
-- Fix profiles table RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view verified providers" ON public.profiles;
DROP POLICY IF EXISTS "Enhanced profiles access for booking details" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Safe profile access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Anonymous users can view verified providers" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can read profiles" ON public.profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can view verified providers" ON public.profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        role = 'provider' AND 
        verification_status = 'approved'
    );

CREATE POLICY "Anonymous users can view verified providers" ON public.profiles
    FOR SELECT USING (
        role = 'provider' AND 
        verification_status = 'approved'
    );

CREATE POLICY "Service role full access" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Fix notifications table RLS policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications" ON public.notifications
    FOR ALL USING (auth.role() = 'service_role');

-- Fix companies table RLS policies
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Users can update own company" ON public.companies;
DROP POLICY IF EXISTS "Users can insert own company" ON public.companies;
DROP POLICY IF EXISTS "Service role can manage companies" ON public.companies;

CREATE POLICY "Users can view own company" ON public.companies
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update own company" ON public.companies
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own company" ON public.companies
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Service role can manage companies" ON public.companies
    FOR ALL USING (auth.role() = 'service_role');

-- Fix bookings table RLS policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role can manage bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings" ON public.bookings
    FOR SELECT USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Users can update own bookings" ON public.bookings
    FOR UPDATE USING (
        auth.uid() = client_id OR 
        auth.uid() = provider_id
    );

CREATE POLICY "Users can insert own bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Service role can manage bookings" ON public.bookings
    FOR ALL USING (auth.role() = 'service_role');

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
```

## Expected Results After Fixes

1. **CSP Violation**: Should be resolved - `vercel.live` scripts will load
2. **500 Internal Server Error**: Should be resolved - API calls will work
3. **RLS Policy Infinite Recursion**: Should be resolved - no more recursion errors

## Verification Steps

1. **Check browser console**: No more CSP violations
2. **Check network tab**: No more 500 errors on API calls
3. **Test user flows**: Sign up, login, dashboard access should work
4. **Run test script**: `node scripts/test-api-endpoints.js` should pass

## Notes

- The RLS policy fixes are designed to be simple and non-recursive
- All policies follow the principle of least privilege
- Service role has full access for admin operations
- Users can only access their own data
- Verified providers are publicly viewable (for booking purposes)

## Files Modified

- `middleware.ts` - Fixed CSP violation
- `supabase/migrations/073_fix_rls_infinite_recursion.sql` - New
- `supabase/migrations/074_fix_notifications_rls.sql` - New  
- `supabase/migrations/075_fix_companies_rls.sql` - New
- `supabase/migrations/076_fix_bookings_rls.sql` - New
- `scripts/test-api-endpoints.js` - New
