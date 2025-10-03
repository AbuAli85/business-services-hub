#!/bin/bash

# Database Performance Optimization Script Runner
# This script runs the optimization commands in the correct order

set -e  # Exit on any error

echo "🚀 Starting Database Performance Optimization..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Get database connection details
read -p "Enter database host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter database port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Enter database name: " DB_NAME
if [ -z "$DB_NAME" ]; then
    echo "❌ Error: Database name is required"
    exit 1
fi

read -p "Enter database username: " DB_USER
if [ -z "$DB_USER" ]; then
    echo "❌ Error: Database username is required"
    exit 1
fi

read -s -p "Enter database password: " DB_PASSWORD
echo

# Set PGPASSWORD environment variable
export PGPASSWORD="$DB_PASSWORD"

# Test database connection
echo "🔍 Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to database. Please check your credentials."
    exit 1
fi
echo "✅ Database connection successful"

# Step 1: Create indexes concurrently (one by one)
echo "📊 Step 1: Creating indexes concurrently..."
echo "This may take several minutes depending on your data size..."

# Read the concurrent index creation script and execute each command individually
while IFS= read -r line; do
    # Skip comments and empty lines
    if [[ "$line" =~ ^[[:space:]]*-- ]] || [[ -z "${line// }" ]]; then
        continue
    fi
    
    # Check if line contains CREATE INDEX CONCURRENTLY
    if [[ "$line" =~ CREATE[[:space:]]+INDEX[[:space:]]+CONCURRENTLY ]]; then
        echo "Creating index: $(echo "$line" | grep -o 'idx_[a-zA-Z_]*')"
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$line"; then
            echo "⚠️  Warning: Failed to create index, continuing..."
        fi
    fi
done < "create-indexes-concurrent.sql"

echo "✅ Index creation completed"

# Step 2: Create views and functions
echo "📊 Step 2: Creating materialized views and functions..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "create-views-and-functions.sql"; then
    echo "✅ Views and functions created successfully"
else
    echo "❌ Error: Failed to create views and functions"
    exit 1
fi

# Step 3: Run initial maintenance
echo "📊 Step 3: Running initial database maintenance..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT run_database_maintenance();"; then
    echo "✅ Initial maintenance completed"
else
    echo "❌ Error: Failed to run initial maintenance"
    exit 1
fi

# Step 4: Verify optimization
echo "📊 Step 4: Verifying optimization..."
echo "Checking created indexes..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
"

echo "Checking materialized views..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    matviewname
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;
"

echo "Checking performance functions..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (routine_name LIKE '%performance%' OR routine_name LIKE '%realtime%')
ORDER BY routine_name;
"

echo ""
echo "🎉 Database Performance Optimization Completed Successfully!"
echo ""
echo "📋 Summary of optimizations applied:"
echo "   ✅ Critical database indexes created"
echo "   ✅ Materialized views for frequently accessed data"
echo "   ✅ Performance monitoring functions"
echo "   ✅ Automated maintenance procedures"
echo ""
echo "📊 Next steps:"
echo "   1. Monitor performance improvements using the Performance Monitor dashboard"
echo "   2. Set up automated maintenance: 0 * * * * psql -d $DB_NAME -c \"SELECT run_database_maintenance();\""
echo "   3. Deploy the realtime optimizer in your application"
echo "   4. Monitor database load and query performance"
echo ""
echo "🔍 To monitor performance, check the performance_log table:"
echo "   SELECT * FROM performance_log ORDER BY timestamp DESC LIMIT 10;"
