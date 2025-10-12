-- Fix inconsistent approval_status and status data
UPDATE services 
SET approval_status = 'approved' 
WHERE status = 'active' AND approval_status = 'pending';

-- Verify the fix
SELECT id, title, approval_status, status 
FROM services 
WHERE approval_status = 'pending' AND status = 'active';
