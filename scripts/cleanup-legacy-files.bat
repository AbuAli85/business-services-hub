@echo off
echo 🧹 Starting Legacy Code Cleanup...
echo ==================================

REM Safety check - make sure we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Not in project root directory
    exit /b 1
)

echo ✅ Confirmed: In project root directory

REM Create backup directory
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "BACKUP_DIR=legacy_backup_%YYYY%%MM%%DD%_%HH%%Min%%Sec%"
mkdir "%BACKUP_DIR%" 2>nul
echo 📦 Created backup directory: %BACKUP_DIR%

echo.
echo 1️⃣ Removing Legacy View Files...
if exist "create_bookings_full_view.sql" (
    echo 🗑️  Removing: create_bookings_full_view.sql
    mkdir "%BACKUP_DIR%" 2>nul
    copy "create_bookings_full_view.sql" "%BACKUP_DIR%\create_bookings_full_view.sql" >nul
    del "create_bookings_full_view.sql"
    echo ✅ Removed and backed up: create_bookings_full_view.sql
) else (
    echo ⚠️  File not found: create_bookings_full_view.sql
)

if exist "scripts\create-views-and-functions.sql" (
    echo 🗑️  Removing: scripts\create-views-and-functions.sql
    mkdir "%BACKUP_DIR%\scripts" 2>nul
    copy "scripts\create-views-and-functions.sql" "%BACKUP_DIR%\scripts\create-views-and-functions.sql" >nul
    del "scripts\create-views-and-functions.sql"
    echo ✅ Removed and backed up: scripts\create-views-and-functions.sql
) else (
    echo ⚠️  File not found: scripts\create-views-and-functions.sql
)

if exist "scripts\optimize-database-performance.sql" (
    echo 🗑️  Removing: scripts\optimize-database-performance.sql
    mkdir "%BACKUP_DIR%\scripts" 2>nul
    copy "scripts\optimize-database-performance.sql" "%BACKUP_DIR%\scripts\optimize-database-performance.sql" >nul
    del "scripts\optimize-database-performance.sql"
    echo ✅ Removed and backed up: scripts\optimize-database-performance.sql
) else (
    echo ⚠️  File not found: scripts\optimize-database-performance.sql
)

echo.
echo 2️⃣ Removing Legacy Migration Files...
if exist "supabase\migrations\043_create_enhanced_bookings_view.sql" (
    echo 🗑️  Removing: supabase\migrations\043_create_enhanced_bookings_view.sql
    mkdir "%BACKUP_DIR%\supabase\migrations" 2>nul
    copy "supabase\migrations\043_create_enhanced_bookings_view.sql" "%BACKUP_DIR%\supabase\migrations\043_create_enhanced_bookings_view.sql" >nul
    del "supabase\migrations\043_create_enhanced_bookings_view.sql"
    echo ✅ Removed and backed up: supabase\migrations\043_create_enhanced_bookings_view.sql
) else (
    echo ⚠️  File not found: supabase\migrations\043_create_enhanced_bookings_view.sql
)

if exist "supabase\migrations\044_fix_enhanced_bookings_view.sql" (
    echo 🗑️  Removing: supabase\migrations\044_fix_enhanced_bookings_view.sql
    mkdir "%BACKUP_DIR%\supabase\migrations" 2>nul
    copy "supabase\migrations\044_fix_enhanced_bookings_view.sql" "%BACKUP_DIR%\supabase\migrations\044_fix_enhanced_bookings_view.sql" >nul
    del "supabase\migrations\044_fix_enhanced_bookings_view.sql"
    echo ✅ Removed and backed up: supabase\migrations\044_fix_enhanced_bookings_view.sql
) else (
    echo ⚠️  File not found: supabase\migrations\044_fix_enhanced_bookings_view.sql
)

echo.
echo 3️⃣ Removing Legacy Documentation...
if exist "docs\booking-list-display-fixes.md" (
    echo 🗑️  Removing: docs\booking-list-display-fixes.md
    mkdir "%BACKUP_DIR%\docs" 2>nul
    copy "docs\booking-list-display-fixes.md" "%BACKUP_DIR%\docs\booking-list-display-fixes.md" >nul
    del "docs\booking-list-display-fixes.md"
    echo ✅ Removed and backed up: docs\booking-list-display-fixes.md
) else (
    echo ⚠️  File not found: docs\booking-list-display-fixes.md
)

if exist "BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md" (
    echo 🗑️  Removing: BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md
    copy "BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md" "%BACKUP_DIR%\BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md" >nul
    del "BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md"
    echo ✅ Removed and backed up: BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md
) else (
    echo ⚠️  File not found: BOOKING_DASHBOARD_DATA_FIXES_SUMMARY.md
)

if exist "BOOKINGS_VERIFICATION_REPORT.md" (
    echo 🗑️  Removing: BOOKINGS_VERIFICATION_REPORT.md
    copy "BOOKINGS_VERIFICATION_REPORT.md" "%BACKUP_DIR%\BOOKINGS_VERIFICATION_REPORT.md" >nul
    del "BOOKINGS_VERIFICATION_REPORT.md"
    echo ✅ Removed and backed up: BOOKINGS_VERIFICATION_REPORT.md
) else (
    echo ⚠️  File not found: BOOKINGS_VERIFICATION_REPORT.md
)

echo.
echo 4️⃣ Removing Legacy Scripts...
if exist "scripts\fix-remaining-security-definer-views.sql" (
    echo 🗑️  Removing: scripts\fix-remaining-security-definer-views.sql
    mkdir "%BACKUP_DIR%\scripts" 2>nul
    copy "scripts\fix-remaining-security-definer-views.sql" "%BACKUP_DIR%\scripts\fix-remaining-security-definer-views.sql" >nul
    del "scripts\fix-remaining-security-definer-views.sql"
    echo ✅ Removed and backed up: scripts\fix-remaining-security-definer-views.sql
) else (
    echo ⚠️  File not found: scripts\fix-remaining-security-definer-views.sql
)

echo.
echo 5️⃣ Removing Legacy Progress System Files...
if exist "lib\progress-tracking.ts" (
    echo 🗑️  Removing: lib\progress-tracking.ts
    mkdir "%BACKUP_DIR%\lib" 2>nul
    copy "lib\progress-tracking.ts" "%BACKUP_DIR%\lib\progress-tracking.ts" >nul
    del "lib\progress-tracking.ts"
    echo ✅ Removed and backed up: lib\progress-tracking.ts
) else (
    echo ⚠️  File not found: lib\progress-tracking.ts
)

if exist "lib\backend-progress-service.ts" (
    echo 🗑️  Removing: lib\backend-progress-service.ts
    mkdir "%BACKUP_DIR%\lib" 2>nul
    copy "lib\backend-progress-service.ts" "%BACKUP_DIR%\lib\backend-progress-service.ts" >nul
    del "lib\backend-progress-service.ts"
    echo ✅ Removed and backed up: lib\backend-progress-service.ts
) else (
    echo ⚠️  File not found: lib\backend-progress-service.ts
)

echo.
echo 🎉 Legacy Code Cleanup Complete!
echo ================================
echo 📦 Backup created in: %BACKUP_DIR%
echo.
echo ✅ Your codebase is now clean and optimized!
echo 🚀 Only the unified v_booking_status system remains active.
echo.
echo Next steps:
echo 1. Test your application to ensure everything works
echo 2. Commit the cleaned codebase
echo 3. Remove the backup directory when you're confident everything works
