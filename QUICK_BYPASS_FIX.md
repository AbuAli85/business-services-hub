# Quick Bypass Fix for Testing

If you want to test the notification system immediately without fixing roles, you can temporarily bypass RLS by using the service role key.

## Option 1: Use Service Role (Quick Test)

Update your Supabase client to use the service role key for admin operations:

```typescript
// In lib/supabase.ts - add a service role client
export async function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey)
}
```

Then update the notification functions to use the service role client for admin operations.

## Option 2: Fix User Role (Recommended)

1. Run the DEBUG_USER_ROLE.sql queries
2. Update your role to 'admin' using FIX_USER_ROLE.sql
3. Test the approval again

## Option 3: Create Admin User

If you don't have an admin profile, create one:

```sql
-- Insert admin profile for your user
INSERT INTO profiles (
  id,
  email,
  role,
  full_name,
  created_at,
  updated_at
) VALUES (
  auth.uid(),
  'your-email@example.com',
  'admin',
  'Your Name',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();
```

The role fix is the cleanest solution and will work for all admin operations.
