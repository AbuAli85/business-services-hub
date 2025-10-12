-- Check the most recent audit log entry
SELECT 
  id,
  service_id,
  event,
  actor_id,
  actor_name,
  actor_email,
  metadata,
  created_at
FROM service_audit_logs
ORDER BY created_at DESC
LIMIT 1;

-- Check the service that was just approved
SELECT 
  id,
  title,
  status,
  approval_status,
  provider_id,
  updated_at
FROM services
WHERE id = (
  SELECT service_id 
  FROM service_audit_logs 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Check recent notifications
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
LIMIT 3;

