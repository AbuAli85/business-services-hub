# Webhook Setup Guide for Automatic Profile Creation

## Overview
This guide explains how to configure Supabase webhooks to automatically create user profiles when new users sign up, eliminating the "Database error saving new user" issue.

## How It Works
1. User signs up with email, password, and metadata (role, full_name, phone)
2. Supabase creates the user in the `auth.users` table
3. Supabase webhook triggers and calls our API endpoint
4. API endpoint extracts user data and calls the `create_user_profile` function
5. Profile is automatically created in the `profiles` table

## Setup Steps

### 1. Deploy the Database Migration
First, run the migration in your Supabase project:

```sql
-- Run migration 024_fix_profile_creation_trigger.sql
-- This creates the necessary functions and tables
```

### 2. Configure Supabase Webhook

#### In Supabase Dashboard:
1. Go to **Database** → **Webhooks**
2. Click **Create a new webhook**
3. Configure the webhook:

**Basic Settings:**
- **Name**: `user-profile-creation`
- **Table**: `auth.users`
- **Events**: Select `INSERT` only
- **HTTP Method**: `POST`
- **URL**: `https://yourdomain.com/api/auth/profile-creation`

**Advanced Settings:**
- **Retry Count**: `3`
- **Timeout**: `30 seconds`
- **Headers**: (leave empty for now)

### 3. Test the Webhook

#### Test the API Endpoint:
```bash
# Test the endpoint is accessible
curl https://yourdomain.com/api/auth/profile-creation
```

#### Test User Signup:
1. Go to your signup page
2. Create a new user account
3. Check the webhook logs in Supabase Dashboard
4. Verify the profile was created in the `profiles` table

### 4. Monitor Webhook Performance

#### Check Webhook Logs:
- **Supabase Dashboard** → **Database** → **Webhooks** → **Logs**
- Look for successful calls and any errors

#### Check Profile Creation Table:
```sql
-- View webhook tracking records
SELECT * FROM profile_creation_webhooks ORDER BY created_at DESC LIMIT 10;

-- View recent profiles
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### Common Issues

#### 1. Webhook Not Triggering
- Verify the webhook is enabled
- Check that `INSERT` events are selected
- Ensure the table is set to `auth.users`

#### 2. 500 Errors from API
- Check server logs for detailed error messages
- Verify the `create_user_profile` function exists
- Check RLS policies on the `profiles` table

#### 3. Profile Not Created
- Check webhook logs in Supabase Dashboard
- Verify the API endpoint is accessible
- Check the `profile_creation_webhooks` table for failed attempts

### Debugging Commands

```sql
-- Check if the function exists
SELECT * FROM information_schema.routines WHERE routine_name = 'create_user_profile';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check webhook tracking
SELECT status, COUNT(*) FROM profile_creation_webhooks GROUP BY status;
```

## Alternative Approaches

### If Webhooks Don't Work

#### Option 1: Manual Profile Creation
Call the `create_user_profile` function directly after signup:

```typescript
// In signup page, after successful user creation
const { data, error } = await supabase.rpc('create_user_profile', {
  user_id: data.user.id,
  user_email: formData.email,
  user_role: formData.role,
  full_name: formData.fullName,
  phone: formData.phone
});
```

#### Option 2: Database Function Call
Create a more robust profile creation function that handles all edge cases.

## Security Considerations

### RLS Policies
- Profiles can only be viewed/updated by the owner
- Service role can create profiles during signup
- Webhook tracking is restricted to service role and user owner

### Webhook Security
- Webhook endpoint validates the request structure
- Only processes `INSERT` events on `auth.users`
- Logs all attempts for monitoring and debugging

## Performance Optimization

### Database Indexes
- `idx_profiles_id` on `profiles.id`
- `idx_webhook_user_id` on `profile_creation_webhooks.user_id`

### Batch Processing
- The `process_profile_creation_webhooks()` function can process multiple pending requests
- Useful for handling webhook failures or retries

## Monitoring and Alerts

### Key Metrics to Watch
1. **Webhook Success Rate**: Should be >95%
2. **Profile Creation Time**: Should be <5 seconds
3. **Failed Attempts**: Investigate any failures

### Alert Conditions
- Webhook failure rate >5%
- Profile creation taking >10 seconds
- Multiple failed attempts for the same user

## Support

If you encounter issues:
1. Check the webhook logs in Supabase Dashboard
2. Review the `profile_creation_webhooks` table
3. Check your application logs for API errors
4. Verify the database migration was applied correctly

## Expected Results

After proper setup:
- ✅ New users can sign up without database errors
- ✅ Profiles are automatically created
- ✅ No more "Database error saving new user" messages
- ✅ Webhook logs show successful profile creation
- ✅ User onboarding process works smoothly
