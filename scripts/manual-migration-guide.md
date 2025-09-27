# Manual Migration Execution Guide

Since the automated migration script requires specific Supabase functions that may not be available, here's how to run the migrations manually:

## Method 1: Supabase CLI (Recommended)

```bash
# Navigate to your project directory
cd C:\Users\HP\OneDrive\Documents\GitHub\business-services-hub

# Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to your database
supabase db push
```

## Method 2: Supabase Dashboard SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file content one by one:

### Step 1: Run 01_roles.sql
Copy the entire content of `supabase/migrations/01_roles.sql` and execute it.

### Step 2: Run 02_user_roles.sql
Copy the entire content of `supabase/migrations/02_user_roles.sql` and execute it.

### Step 3: Run 03_views.sql
Copy the entire content of `supabase/migrations/03_views.sql` and execute it.

### Step 4: Run 04_cleanup.sql
Copy the entire content of `supabase/migrations/04_cleanup.sql` and execute it.

## Method 3: Direct SQL Execution

If you have direct database access, you can run the SQL files directly using your preferred PostgreSQL client.

## Verification Steps

After running all migrations, verify they worked by running these queries:

```sql
-- Check if roles table was created
SELECT * FROM roles;

-- Check if user_roles table was created
SELECT * FROM user_roles;

-- Check if views were created
SELECT * FROM booking_enriched LIMIT 1;
SELECT * FROM service_enriched LIMIT 1;
SELECT * FROM user_enriched LIMIT 1;

-- Check if functions were created
SELECT * FROM get_user_roles('some-user-id');
SELECT * FROM detect_data_drift();
```

## Expected Results

- **roles table**: Should contain 5 default roles (admin, provider, client, staff, manager)
- **user_roles table**: Should be populated with existing user roles from profiles.role
- **Views**: Should return data with enriched information
- **Functions**: Should execute without errors

## Troubleshooting

If you encounter errors:

1. **"relation already exists"**: This is normal for some statements with IF NOT EXISTS
2. **"permission denied"**: Make sure you're using the service role key
3. **"function does not exist"**: Some functions may need to be created in a specific order

## Next Steps After Migration

1. Update your UI components to use the new enriched views
2. Test role assignment functionality
3. Run data drift detection and cleanup
4. Monitor data quality using the provided views

## Rollback (if needed)

If you need to rollback:

```sql
-- Drop views
DROP VIEW IF EXISTS booking_enriched;
DROP VIEW IF EXISTS service_enriched;
DROP VIEW IF EXISTS user_enriched;

-- Drop functions
DROP FUNCTION IF EXISTS get_user_roles(UUID);
DROP FUNCTION IF EXISTS detect_data_drift();
-- ... (drop other functions)

-- Drop tables
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
```
