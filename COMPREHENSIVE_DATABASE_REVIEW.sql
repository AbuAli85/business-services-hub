-- Comprehensive Database Review and Fix Script
-- Check current service status distribution
SELECT 
  approval_status,
  status,
  COUNT(*) as count
FROM services 
GROUP BY approval_status, status
ORDER BY approval_status, status;

-- Check for any remaining inconsistencies
SELECT 
  id, 
  title, 
  approval_status, 
  status,
  created_at,
  updated_at
FROM services 
WHERE (approval_status = 'pending' AND status = 'active') 
   OR (approval_status = 'approved' AND status != 'active')
ORDER BY updated_at DESC;

-- Check for services with null or invalid status values
SELECT 
  id,
  title,
  approval_status,
  status,
  CASE 
    WHEN approval_status IS NULL THEN 'Missing approval_status'
    WHEN status IS NULL THEN 'Missing status'
    WHEN approval_status NOT IN ('pending', 'approved', 'rejected') THEN 'Invalid approval_status'
    WHEN status NOT IN ('active', 'inactive', 'suspended', 'archived', 'draft') THEN 'Invalid status'
    ELSE 'OK'
  END as issue
FROM services 
WHERE approval_status IS NULL 
   OR status IS NULL 
   OR approval_status NOT IN ('pending', 'approved', 'rejected')
   OR status NOT IN ('active', 'inactive', 'suspended', 'archived', 'draft')
ORDER BY created_at DESC;

-- Check recent audit logs for any failed operations
SELECT 
  id,
  service_id,
  event,
  actor_name,
  created_at,
  metadata
FROM service_audit_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Check notifications table for any issues
SELECT 
  id,
  user_id,
  type,
  data,
  read_at,
  created_at
FROM notifications 
WHERE type LIKE '%service%'
ORDER BY created_at DESC 
LIMIT 10;
