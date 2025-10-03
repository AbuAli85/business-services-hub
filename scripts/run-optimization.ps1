# Database Performance Optimization Script Runner for PowerShell
# This script runs the optimization commands in the correct order

Write-Host "🚀 Starting Database Performance Optimization..." -ForegroundColor Green

# Check if psql is available
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "❌ Error: psql command not found. Please install PostgreSQL client tools." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Get database connection details
$DB_HOST = Read-Host "Enter database host (default: localhost)"
if ([string]::IsNullOrEmpty($DB_HOST)) { $DB_HOST = "localhost" }

$DB_PORT = Read-Host "Enter database port (default: 5432)"
if ([string]::IsNullOrEmpty($DB_PORT)) { $DB_PORT = "5432" }

$DB_NAME = Read-Host "Enter database name"
if ([string]::IsNullOrEmpty($DB_NAME)) {
    Write-Host "❌ Error: Database name is required" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$DB_USER = Read-Host "Enter database username"
if ([string]::IsNullOrEmpty($DB_USER)) {
    Write-Host "❌ Error: Database username is required" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$DB_PASSWORD = Read-Host "Enter database password" -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

# Test database connection
Write-Host "🔍 Testing database connection..." -ForegroundColor Yellow
$env:PGPASSWORD = $DB_PASSWORD_PLAIN

try {
    $testResult = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Connection failed"
    }
    Write-Host "✅ Database connection successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Cannot connect to database. Please check your credentials." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 1: Create indexes concurrently
Write-Host "📊 Step 1: Creating indexes concurrently..." -ForegroundColor Yellow
Write-Host "This may take several minutes depending on your data size..." -ForegroundColor Yellow

$indexCommands = @(
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_milestone_id ON milestone_approvals(milestone_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_created_at ON milestone_approvals(created_at DESC);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_status ON milestone_approvals(status);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON profiles(email);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_status_created_at ON services(status, created_at DESC);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_id ON services(provider_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created_at ON bookings(status, created_at DESC);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON invoices(status);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status ON tasks(status);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_booking_id ON time_entries(booking_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_logged_at ON time_entries(logged_at DESC);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_booking_id ON milestones(booking_id);",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_status ON milestones(status);"
)

foreach ($command in $indexCommands) {
    $indexName = if ($command -match "idx_([a-zA-Z_]+)") { $matches[1] } else { "unknown" }
    Write-Host "Creating index: $indexName" -ForegroundColor Cyan
    
    try {
        $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $command 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️  Warning: Failed to create index $indexName, continuing..." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Warning: Failed to create index $indexName, continuing..." -ForegroundColor Yellow
    }
}

Write-Host "✅ Index creation completed" -ForegroundColor Green

# Step 2: Create views and functions
Write-Host "📊 Step 2: Creating materialized views and functions..." -ForegroundColor Yellow
try {
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "create-views-and-functions.sql" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create views and functions"
    }
    Write-Host "✅ Views and functions created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Failed to create views and functions" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 3: Run initial maintenance
Write-Host "📊 Step 3: Running initial database maintenance..." -ForegroundColor Yellow
try {
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT run_database_maintenance();" 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to run initial maintenance"
    }
    Write-Host "✅ Initial maintenance completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Failed to run initial maintenance" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 4: Verify optimization
Write-Host "📊 Step 4: Verifying optimization..." -ForegroundColor Yellow

Write-Host "Checking created indexes..." -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY tablename, indexname;"

Write-Host "Checking materialized views..." -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname = 'public' ORDER BY matviewname;"

Write-Host "Checking performance functions..." -ForegroundColor Cyan
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public' AND (routine_name LIKE '%performance%' OR routine_name LIKE '%realtime%') ORDER BY routine_name;"

Write-Host ""
Write-Host "🎉 Database Performance Optimization Completed Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary of optimizations applied:" -ForegroundColor White
Write-Host "   ✅ Critical database indexes created" -ForegroundColor Green
Write-Host "   ✅ Materialized views for frequently accessed data" -ForegroundColor Green
Write-Host "   ✅ Performance monitoring functions" -ForegroundColor Green
Write-Host "   ✅ Automated maintenance procedures" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor White
Write-Host "   1. Monitor performance improvements using the Performance Monitor dashboard" -ForegroundColor Cyan
Write-Host "   2. Set up automated maintenance: 0 * * * * psql -d $DB_NAME -c `"SELECT run_database_maintenance();`"" -ForegroundColor Cyan
Write-Host "   3. Deploy the realtime optimizer in your application" -ForegroundColor Cyan
Write-Host "   4. Monitor database load and query performance" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 To monitor performance, check the performance_log table:" -ForegroundColor White
Write-Host "   SELECT * FROM performance_log ORDER BY timestamp DESC LIMIT 10;" -ForegroundColor Cyan
Write-Host ""

# Clean up password
$DB_PASSWORD_PLAIN = $null
$env:PGPASSWORD = $null

Read-Host "Press Enter to exit"
