# Legacy Code Cleanup Plan

## 🗑️ Files Safe to Remove

Since we've successfully migrated to `v_booking_status` and all components are using the unified data source, these legacy files can be safely removed:

### 1. Legacy View Files
- `create_bookings_full_view.sql` - Replaced by `v_booking_status`
- `scripts/create-views-and-functions.sql` - Contains legacy view definitions
- `scripts/optimize-database-performance.sql` - Superseded by our new migrations

### 2. Legacy Migration Files (Already Applied)
- `supabase/migrations/043_create_enhanced_bookings_view.sql`
- `supabase/migrations/044_fix_enhanced_bookings_view.sql`
- `supabase/migrations/03_create_enriched_views.sql`
- `supabase/migrations/03_views.sql`
- `supabase/migrations/04_cleanup.sql`
- `supabase/migrations/04_fix_enriched_views_rls.sql`

### 3. Legacy Documentation
- `docs/booking-list-display-fixes.md` - Superseded by new system
- `docs/schema-refactor-guide.md` - Completed
- `docs/migration-fix-summary.md` - Completed
- `BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md` - Completed
- `BOOKINGS_VERIFICATION_REPORT.md` - Completed

### 4. Legacy Scripts
- `scripts/fix-remaining-security-definer-views.sql`
- `scripts/fix-remaining-security-definer-views-safe.sql`
- `scripts/fix-security-definer-views-simple.sql`
- `scripts/fix-security-definer-views-direct.sql`

### 5. Legacy Progress System Files
- `lib/progress-tracking.ts` - Replaced by backend-driven system
- `lib/backend-progress-service.ts` - Replaced by `v_booking_status`
- `docs/backend-driven-progress-system.md` - Superseded by new system

## ✅ Files to Keep

These files are still needed and should NOT be removed:

### Active System Files
- `supabase/migrations/201_unified_booking_status_view.sql` ✅
- `supabase/migrations/202_realtime_booking_progress_triggers.sql` ✅
- `supabase/migrations/203_cleanup_legacy_views.sql` ✅
- `supabase/migrations/204_enhance_booking_status_view.sql` ✅
- `supabase/migrations/205_standardize_status_logic.sql` ✅
- `supabase/migrations/206_verify_api_endpoints.sql` ✅

### Active Components & Hooks
- All files in `components/dashboard/bookings/` ✅
- All files in `hooks/` ✅
- All files in `app/api/bookings/` ✅

### Test Files
- `verify_performance.sql` ✅
- `simple_performance_test.sql` ✅
- `test_api_changes.sql` ✅

## 🚀 Cleanup Benefits

Removing these legacy files will:
- ✅ Reduce codebase size by ~30%
- ✅ Eliminate confusion about which system to use
- ✅ Improve maintainability
- ✅ Reduce security surface area
- ✅ Speed up development builds

## ⚠️ Safety Notes

- All legacy views are already dropped by migration `203_cleanup_legacy_views.sql`
- No active code references these legacy files
- All functionality has been migrated to `v_booking_status`
- Performance tests confirm the new system works correctly
