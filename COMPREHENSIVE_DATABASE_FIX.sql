-- Comprehensive Database Cleanup and Fix Script
-- 1. Fix any remaining status inconsistencies
UPDATE services 
SET approval_status = 'approved' 
WHERE status = 'active' AND approval_status = 'pending';

-- 2. Fix services that are approved but not active (should be active)
UPDATE services 
SET status = 'active' 
WHERE approval_status = 'approved' AND status NOT IN ('suspended', 'archived');

-- 3. Fix services that are rejected but not archived (should be archived)
UPDATE services 
SET status = 'archived' 
WHERE approval_status = 'rejected' AND status != 'archived';

-- 4. Clean up any null or invalid status values
UPDATE services 
SET status = 'active' 
WHERE status IS NULL AND approval_status = 'approved';

UPDATE services 
SET status = 'draft' 
WHERE status IS NULL AND approval_status = 'pending';

UPDATE services 
SET approval_status = 'pending' 
WHERE approval_status IS NULL;

-- 5. Fix featured services that should be approved
UPDATE services 
SET approval_status = 'approved', status = 'active' 
WHERE featured = true AND approval_status = 'pending';

-- 6. Clean up orphaned audit logs (services that no longer exist)
DELETE FROM service_audit_logs 
WHERE service_id NOT IN (SELECT id FROM services);

-- 7. Clean up orphaned notifications (users that no longer exist)
DELETE FROM notifications 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- 8. Verify the fixes
SELECT 
  'Services Status Summary' as check_type,
  approval_status,
  status,
  COUNT(*) as count
FROM services 
GROUP BY approval_status, status
ORDER BY approval_status, status;

-- 9. Check for any remaining issues
SELECT 
  'Remaining Issues' as check_type,
  id,
  title,
  approval_status,
  status,
  featured,
  CASE 
    WHEN approval_status = 'pending' AND status = 'active' THEN 'Inconsistent: pending but active'
    WHEN approval_status = 'approved' AND status NOT IN ('active', 'suspended') THEN 'Inconsistent: approved but not active'
    WHEN approval_status = 'rejected' AND status != 'archived' THEN 'Inconsistent: rejected but not archived'
    WHEN featured = true AND approval_status != 'approved' THEN 'Featured service not approved'
    WHEN status IS NULL THEN 'Missing status'
    WHEN approval_status IS NULL THEN 'Missing approval_status'
    ELSE 'OK'
  END as issue
FROM services 
WHERE (approval_status = 'pending' AND status = 'active')
   OR (approval_status = 'approved' AND status NOT IN ('active', 'suspended'))
   OR (approval_status = 'rejected' AND status != 'archived')
   OR (featured = true AND approval_status != 'approved')
   OR status IS NULL 
   OR approval_status IS NULL
ORDER BY created_at DESC;