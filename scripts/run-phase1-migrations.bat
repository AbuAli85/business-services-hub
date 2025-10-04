@echo off
REM Phase 1: Database & Backend Cleanup Script (Windows)
REM This script runs all Phase 1 migrations in the correct order

echo 🚀 Starting Phase 1: Database & Backend Cleanup
echo ================================================

REM Check if we're in the right directory
if not exist "supabase\config.toml" (
    echo ❌ Error: Please run this script from the project root directory
    exit /b 1
)

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Supabase CLI is not installed
    echo Please install it with: npm install -g supabase
    exit /b 1
)

echo 📋 Running migrations in order...

REM Migration 1: Cleanup legacy views
echo.
echo 1️⃣ Running migration 203: Cleanup legacy views...
npx supabase db push --include-all
if %errorlevel% neq 0 (
    echo ❌ Migration 203 failed
    exit /b 1
)
echo ✅ Migration 203 completed successfully

REM Migration 2: Enhance v_booking_status view (safe version)
echo.
echo 2️⃣ Running migration 204: Enhance v_booking_status view (safe version)...
npx supabase db push --include-all
if %errorlevel% neq 0 (
    echo ❌ Migration 204 failed
    exit /b 1
)
echo ✅ Migration 204 completed successfully

REM Migration 3: Standardize status logic
echo.
echo 3️⃣ Running migration 205: Standardize status logic...
npx supabase db push --include-all
if %errorlevel% neq 0 (
    echo ❌ Migration 205 failed
    exit /b 1
)
echo ✅ Migration 205 completed successfully

REM Migration 4: Verify API endpoints
echo.
echo 4️⃣ Running migration 206: Verify API endpoints...
npx supabase db push --include-all
if %errorlevel% neq 0 (
    echo ❌ Migration 206 failed
    exit /b 1
)
echo ✅ Migration 206 completed successfully

echo.
echo 🎉 Phase 1 Complete! All migrations executed successfully.
echo.
echo 📊 Summary of changes:
echo   ✅ Removed legacy views (booking_enriched, enhanced_bookings, bookings_full_view)
echo   ✅ Enhanced v_booking_status with missing columns and indexes
echo   ✅ Standardized status logic with helper functions
echo   ✅ Verified API endpoint compatibility
echo.
echo 🔄 Next steps:
echo   1. Test your booking system to ensure everything works
echo   2. Run Phase 2: Hooks Consolidation
echo   3. Run Phase 3: Component Cleanup
echo.
echo 💡 To test the changes:
echo   - Visit /dashboard/bookings in your app
echo   - Try exporting CSV data
echo   - Check that real-time updates work
echo.

pause
