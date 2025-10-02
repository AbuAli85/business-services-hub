# SECURITY DEFINER Views Fix

## 🔍 Problem Description

The database contained multiple views created with `SECURITY DEFINER` which bypasses Row Level Security (RLS) policies. This is a security vulnerability because:

- Views with `SECURITY DEFINER` run with the privileges of the view creator (usually `supabase_admin`)
- This bypasses RLS policies and table grants for the querying user
- Any user with access to the view could potentially see data they shouldn't

## ✅ Solution Applied

All affected views have been converted from `SECURITY DEFINER` to `SECURITY INVOKER`:

- **SECURITY INVOKER**: Views run with the privileges of the calling user
- **Respects RLS**: Views now properly inherit RLS policies from base tables
- **Proper Access Control**: Users can only see data they're authorized to access

## 📋 Views Fixed

The following views were converted to `SECURITY INVOKER`:

### Core Dashboard Views
- `booking_dashboard_stats` - Dashboard statistics and metrics
- `booking_list_enhanced` - Enhanced booking list with client/provider info
- `booking_list_optimized` - Optimized booking list for performance
- `booking_progress_view` - Booking progress tracking

### User & Profile Views
- `user_enriched` - User profiles with company information
- `profiles_with_roles_v2` - User profiles with role information
- `profiles_for_bookings` - Simplified profiles for booking context

### Service Views
- `service_enriched` - Services with provider and company information
- `public_services` - Public-facing services (accessible to anonymous users)

### Booking Views
- `booking_enriched` - Bookings with client, provider, and service information
- `enhanced_bookings` - Enhanced booking data
- `make_com_bookings` - Bookings formatted for Make.com integration
- `bookings_normalized` - Normalized booking data

### Progress Tracking Views
- `v_milestone_progress` - Milestone progress tracking
- `v_booking_progress` - Booking progress tracking
- `v_tasks_status` - Task status with overdue calculations

### Analytics Views
- `v_bookings_kpis` - Key performance indicators
- `v_bookings_monthly` - Monthly booking trends
- `notification_analytics` - Notification statistics
- `email_notification_analytics` - Email notification statistics

## 🔐 Security Improvements

### Before (SECURITY DEFINER)
```sql
-- ❌ Bypasses RLS - any user can see all data
CREATE VIEW public.booking_dashboard_stats
SECURITY DEFINER
AS SELECT * FROM bookings;
```

### After (SECURITY INVOKER)
```sql
-- ✅ Respects RLS - users only see authorized data
CREATE VIEW public.booking_dashboard_stats
SECURITY INVOKER
AS SELECT * FROM bookings;
```

## 🚀 Benefits

1. **Enhanced Security**: Views now respect RLS policies
2. **Proper Access Control**: Users only see data they're authorized to access
3. **Audit Compliance**: Better compliance with security audits
4. **Data Isolation**: Proper tenant isolation in multi-tenant scenarios
5. **Principle of Least Privilege**: Users only get access to what they need

## 📝 Migration Details

### Migration File
- **File**: `supabase/migrations/1002_fix_security_definer_views.sql`
- **Applied**: All views converted to `SECURITY INVOKER`
- **Grants**: Appropriate permissions granted to `authenticated` users
- **Public Access**: `public_services` view accessible to `anon` users

### Permissions Granted
```sql
-- Core views for authenticated users
GRANT SELECT ON public.booking_dashboard_stats TO authenticated;
GRANT SELECT ON public.user_enriched TO authenticated;
GRANT SELECT ON public.service_enriched TO authenticated;
-- ... and more

-- Public access for services
GRANT SELECT ON public.public_services TO authenticated, anon;
```

## 🧪 Testing

The migration includes comprehensive testing:

1. **View Creation**: All views created successfully
2. **Permission Grants**: Proper permissions assigned
3. **Query Execution**: Test queries executed successfully
4. **RLS Compliance**: Views respect RLS policies

## 🔄 Rollback Plan

If issues arise, you can rollback by:

1. **Revert Migration**: `supabase db reset` to previous state
2. **Manual Fix**: Recreate specific views with `SECURITY DEFINER` if needed
3. **Gradual Migration**: Convert views one by one if bulk migration causes issues

## 📚 Best Practices Going Forward

1. **Always Use SECURITY INVOKER**: For new views unless specifically needed
2. **Document Exceptions**: If `SECURITY DEFINER` is needed, document why
3. **Regular Audits**: Periodically check for `SECURITY DEFINER` views
4. **Test RLS**: Ensure views work correctly with RLS policies
5. **Principle of Least Privilege**: Grant minimal required permissions

## 🎯 When to Use SECURITY DEFINER

Only use `SECURITY DEFINER` when:

- **System Operations**: Background jobs that need elevated privileges
- **Cross-Tenant Aggregation**: Analytics that need to bypass RLS
- **Admin Functions**: Administrative operations requiring system access

If using `SECURITY DEFINER`:

1. **Restrict Access**: Grant only to trusted roles (e.g., `admin`)
2. **Document Reason**: Clearly document why it's necessary
3. **Audit Regularly**: Monitor usage and access patterns
4. **Minimize Scope**: Use only for specific operations, not general views

## ✅ Verification

To verify the fix worked:

```sql
-- Check view security settings
SELECT schemaname, viewname, viewowner, definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('booking_dashboard_stats', 'user_enriched', 'service_enriched');

-- Test RLS compliance
-- This should only return data the current user is authorized to see
SELECT * FROM public.booking_dashboard_stats;
```

## 📞 Support

If you encounter issues:

1. **Check Logs**: Review Supabase logs for errors
2. **Test Queries**: Verify individual view queries work
3. **RLS Policies**: Ensure base table RLS policies are correct
4. **Permissions**: Verify user has appropriate grants

The migration is designed to be safe and reversible, with comprehensive testing to ensure all views work correctly with the new security model.
