# Manual Database Optimization Execution Guide

## 🚨 Issue: CREATE INDEX CONCURRENTLY cannot run inside a transaction block

The error occurs because PostgreSQL doesn't allow `CREATE INDEX CONCURRENTLY` commands to run inside a transaction block. When you run an entire SQL script, PostgreSQL wraps it in a transaction, which causes this error.

## ✅ Solution: Run Commands Individually

### Option 1: Use the Automated Scripts (Recommended)

#### For Windows (Command Prompt):
```cmd
cd scripts
run-optimization.bat
```

#### For Windows (PowerShell):
```powershell
cd scripts
.\run-optimization.ps1
```

#### For Linux/Mac:
```bash
cd scripts
chmod +x run-optimization.sh
./run-optimization.sh
```

### Option 2: Manual Execution (Step by Step)

#### Step 1: Create Indexes Concurrently (One by One)

Run each of these commands individually in your PostgreSQL client:

```sql
-- Milestone Approvals Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_milestone_id ON milestone_approvals(milestone_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_created_at ON milestone_approvals(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_status ON milestone_approvals(status);

-- Notifications Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Profiles Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id_role ON profiles(id, role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Services Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_status_created_at ON services(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_id ON services(provider_id);

-- Bookings Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created_at ON bookings(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);

-- Invoices Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Tasks Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_milestone_id ON tasks(milestone_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Time Entries Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_booking_id ON time_entries(booking_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_logged_at ON time_entries(logged_at DESC);

-- Milestones Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_booking_id ON milestones(booking_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_status ON milestones(status);
```

#### Step 2: Create Views and Functions

After all indexes are created, run the views and functions script:

```bash
psql -d your_database -f create-views-and-functions.sql
```

#### Step 3: Run Initial Maintenance

```sql
SELECT run_database_maintenance();
```

#### Step 4: Verify Optimization

```sql
-- Check created indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check materialized views
SELECT 
    schemaname,
    matviewname
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Check performance functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (routine_name LIKE '%performance%' OR routine_name LIKE '%realtime%')
ORDER BY routine_name;
```

## 🔧 Using Different PostgreSQL Clients

### pgAdmin:
1. Open Query Tool
2. Run each `CREATE INDEX CONCURRENTLY` command individually
3. Wait for each to complete before running the next

### psql Command Line:
```bash
# Run each command individually
psql -d your_database -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_milestone_id ON milestone_approvals(milestone_id);"
psql -d your_database -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_created_at ON milestone_approvals(created_at DESC);"
# ... continue for each index
```

### DBeaver:
1. Open SQL Editor
2. Run each `CREATE INDEX CONCURRENTLY` command one at a time
3. Use "Execute SQL Statement" (Ctrl+Enter) for each command

### TablePlus:
1. Open Query Window
2. Run each `CREATE INDEX CONCURRENTLY` command individually
3. Use "Run Current Query" for each command

## ⏱️ Expected Execution Time

- **Small database (< 1GB)**: 5-15 minutes
- **Medium database (1-10GB)**: 15-60 minutes  
- **Large database (> 10GB)**: 1-4 hours

## 🚨 Important Notes

1. **Run during low-traffic periods** - Index creation can impact performance
2. **Don't interrupt the process** - Let each index creation complete
3. **Monitor disk space** - Index creation requires additional disk space
4. **Check for errors** - If an index fails, you can retry it individually

## 🔍 Troubleshooting

### If an index creation fails:
```sql
-- Check if the index already exists
SELECT indexname FROM pg_indexes WHERE indexname = 'your_index_name';

-- Drop and recreate if needed
DROP INDEX CONCURRENTLY IF EXISTS your_index_name;
CREATE INDEX CONCURRENTLY your_index_name ON your_table(your_column);
```

### If you get permission errors:
```sql
-- Grant necessary permissions
GRANT CREATE ON SCHEMA public TO your_user;
GRANT USAGE ON SCHEMA public TO your_user;
```

### If you run out of disk space:
```sql
-- Check disk usage
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## ✅ Success Indicators

After successful execution, you should see:
- All indexes created without errors
- Materialized views created successfully
- Performance functions available
- Initial maintenance completed
- Performance log entries created

## 📊 Next Steps

1. **Monitor performance improvements** using the Performance Monitor dashboard
2. **Set up automated maintenance** with a cron job
3. **Deploy the realtime optimizer** in your application
4. **Monitor database load** and query performance

---

**Remember: The key is to run each `CREATE INDEX CONCURRENTLY` command individually, not as part of a larger script!**
