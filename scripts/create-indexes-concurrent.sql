-- Database Index Creation Script (Concurrent)
-- This script creates indexes concurrently to avoid blocking operations
-- Run each command individually to avoid transaction block issues

-- ==============================================
-- MILESTONE APPROVALS INDEXES
-- ==============================================

-- Index for milestone_approvals milestone_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_milestone_id 
ON milestone_approvals(milestone_id);

-- Index for milestone_approvals created_at ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_created_at 
ON milestone_approvals(created_at DESC);

-- Index for milestone_approvals status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestone_approvals_status 
ON milestone_approvals(status);

-- ==============================================
-- NOTIFICATIONS INDEXES
-- ==============================================

-- Index for notifications created_at ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

-- Index for notifications user_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

-- ==============================================
-- PROFILES INDEXES
-- ==============================================

-- Index for profiles id and role lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id_role 
ON profiles(id, role);

-- Index for profiles email lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email 
ON profiles(email);

-- ==============================================
-- SERVICES INDEXES
-- ==============================================

-- Index for services status and created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_status_created_at 
ON services(status, created_at DESC);

-- Index for services provider_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_id 
ON services(provider_id);

-- ==============================================
-- BOOKINGS INDEXES
-- ==============================================

-- Index for bookings client_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_client_id 
ON bookings(client_id);

-- Index for bookings provider_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_id 
ON bookings(provider_id);

-- Index for bookings status and created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_status_created_at 
ON bookings(status, created_at DESC);

-- Index for bookings service_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_service_id 
ON bookings(service_id);

-- ==============================================
-- INVOICES INDEXES
-- ==============================================

-- Index for invoices booking_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_booking_id 
ON invoices(booking_id);

-- Index for invoices status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_status 
ON invoices(status);

-- ==============================================
-- TASKS INDEXES
-- ==============================================

-- Index for tasks milestone_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_milestone_id 
ON tasks(milestone_id);

-- Index for tasks status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_status 
ON tasks(status);

-- ==============================================
-- TIME ENTRIES INDEXES
-- ==============================================

-- Index for time_entries booking_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_booking_id 
ON time_entries(booking_id);

-- Index for time_entries logged_at ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_logged_at 
ON time_entries(logged_at DESC);

-- ==============================================
-- MILESTONES INDEXES
-- ==============================================

-- Index for milestones booking_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_booking_id 
ON milestones(booking_id);

-- Index for milestones status filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_milestones_status 
ON milestones(status);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check index creation status
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY idx_tup_read DESC;
