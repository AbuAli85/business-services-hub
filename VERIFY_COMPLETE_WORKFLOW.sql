-- =====================================================
-- VERIFY COMPLETE APPROVAL WORKFLOW
-- =====================================================
-- This script verifies that all parts of the service
-- approval workflow are working correctly
-- =====================================================

-- Step 1: Check recent audit logs (should show app-generated logs)
-- =====================================================
SELECT 
  service_id,
  event,
  actor_id,
  actor_name,
  actor_email,
  metadata,
  created_at
FROM service_audit_logs
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check the service status (should be 'approved' and 'active')
-- =====================================================
SELECT 
  id,
  title,
  status,
  approval_status,
  updated_at
FROM services
WHERE id = '3fc4f5f2-35e9-4b86-beb1-f43d3e97483a';

-- Step 3: Check recent notifications (should show provider notifications)
-- =====================================================
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  data,
  read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check provider profile (to verify notification recipient)
-- =====================================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  COUNT(DISTINCT s.id) as total_services,
  COUNT(DISTINCT n.id) as unread_notifications
FROM profiles p
LEFT JOIN services s ON s.provider_id = p.id
LEFT JOIN notifications n ON n.user_id = p.id AND n.read = false
WHERE s.id = '3fc4f5f2-35e9-4b86-beb1-f43d3e97483a'
GROUP BY p.id, p.email, p.full_name;

-- Step 5: Check all audit logs for this specific service
-- =====================================================
SELECT 
  event,
  actor_name,
  metadata,
  created_at
FROM service_audit_logs
WHERE service_id = '3fc4f5f2-35e9-4b86-beb1-f43d3e97483a'
ORDER BY created_at ASC;

-- Step 6: Summary statistics
-- =====================================================
SELECT 
  'Total Audit Logs' as metric,
  COUNT(*) as count
FROM service_audit_logs
UNION ALL
SELECT 
  'Total Notifications' as metric,
  COUNT(*) as count
FROM notifications
UNION ALL
SELECT 
  'Approved Services' as metric,
  COUNT(*) as count
FROM services
WHERE approval_status = 'approved'
UNION ALL
SELECT 
  'Pending Services' as metric,
  COUNT(*) as count
FROM services
WHERE approval_status = 'pending';

