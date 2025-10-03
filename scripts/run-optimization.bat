@echo off
setlocal enabledelayedexpansion

REM Database Performance Optimization Script Runner for Windows
REM This script runs the optimization commands in the correct order

echo 🚀 Starting Database Performance Optimization...

REM Check if psql is available
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: psql command not found. Please install PostgreSQL client tools.
    pause
    exit /b 1
)

REM Get database connection details
set /p DB_HOST="Enter database host (default: localhost): "
if "%DB_HOST%"=="" set DB_HOST=localhost

set /p DB_PORT="Enter database port (default: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set /p DB_NAME="Enter database name: "
if "%DB_NAME%"=="" (
    echo ❌ Error: Database name is required
    pause
    exit /b 1
)

set /p DB_USER="Enter database username: "
if "%DB_USER%"=="" (
    echo ❌ Error: Database username is required
    pause
    exit /b 1
)

set /p DB_PASSWORD="Enter database password: "

REM Test database connection
echo 🔍 Testing database connection...
set PGPASSWORD=%DB_PASSWORD%
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Cannot connect to database. Please check your credentials.
    pause
    exit /b 1
)
echo ✅ Database connection successful

REM Step 1: Create indexes concurrently (one by one)
echo 📊 Step 1: Creating indexes concurrently...
echo This may take several minutes depending on your data size...

REM Create indexes one by one to avoid transaction block issues
echo Creating milestone_approvals indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_milestone_id ON milestone_approvals(milestone_id);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_created_at ON milestone_approvals(created_at DESC);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_status ON milestone_approvals(status);"

echo Creating notifications indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);"

echo Creating profiles indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON profiles(email);"

echo Creating services indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_status_created_at ON services(status, created_at DESC);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_id ON services(provider_id);"

echo Creating bookings indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created_at ON bookings(status, created_at DESC);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);"

echo Creating invoices indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON invoices(status);"

echo Creating tasks indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status ON tasks(status);"

echo Creating time_entries indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_booking_id ON time_entries(booking_id);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_logged_at ON time_entries(logged_at DESC);"

echo Creating milestones indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_booking_id ON milestones(booking_id);"
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_status ON milestones(status);"

echo ✅ Index creation completed

REM Step 2: Create views and functions
echo 📊 Step 2: Creating materialized views and functions...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "create-views-and-functions.sql"
if %errorlevel% neq 0 (
    echo ❌ Error: Failed to create views and functions
    pause
    exit /b 1
)
echo ✅ Views and functions created successfully

REM Step 3: Run initial maintenance
echo 📊 Step 3: Running initial database maintenance...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT run_database_maintenance();"
if %errorlevel% neq 0 (
    echo ❌ Error: Failed to run initial maintenance
    pause
    exit /b 1
)
echo ✅ Initial maintenance completed

REM Step 4: Verify optimization
echo 📊 Step 4: Verifying optimization...
echo Checking created indexes...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename, indexname;"

echo Checking materialized views...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname = 'public' ORDER BY matviewname;"

echo Checking performance functions...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public' AND (routine_name LIKE '%%performance%%' OR routine_name LIKE '%%realtime%%') ORDER BY routine_name;"

echo.
echo 🎉 Database Performance Optimization Completed Successfully!
echo.
echo 📋 Summary of optimizations applied:
echo    ✅ Critical database indexes created
echo    ✅ Materialized views for frequently accessed data
echo    ✅ Performance monitoring functions
echo    ✅ Automated maintenance procedures
echo.
echo 📊 Next steps:
echo    1. Monitor performance improvements using the Performance Monitor dashboard
echo    2. Set up automated maintenance: 0 * * * * psql -d %DB_NAME% -c "SELECT run_database_maintenance();"
echo    3. Deploy the realtime optimizer in your application
echo    4. Monitor database load and query performance
echo.
echo 🔍 To monitor performance, check the performance_log table:
echo    SELECT * FROM performance_log ORDER BY timestamp DESC LIMIT 10;
echo.
pause
