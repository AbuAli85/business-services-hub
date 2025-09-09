-- Update notification types to include all new types
-- Run this in your Supabase SQL Editor

-- Add new notification types to the existing enum
-- Note: This is a simplified approach - in production you might want to use a more robust migration

-- First, let's check what notification types are currently being used
SELECT DISTINCT type FROM notifications ORDER BY type;

-- Add new notification types by updating the constraint
-- We'll drop and recreate the constraint to include all new types

-- Drop existing constraint if it exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new comprehensive constraint
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  -- Task notifications
  'task_created', 'task_updated', 'task_completed', 'task_overdue', 'task_assigned', 'task_comment',
  'task_deleted', 'task_archived', 'task_restored', 'task_priority_changed', 'task_due_date_changed', 'task_reminder',
  
  -- Milestone notifications
  'milestone_created', 'milestone_updated', 'milestone_completed', 'milestone_overdue', 'milestone_approved', 'milestone_rejected',
  'milestone_deleted', 'milestone_archived', 'milestone_restored', 'milestone_reminder',
  
  -- Booking notifications
  'booking_created', 'booking_updated', 'booking_cancelled', 'booking_confirmed', 'booking_reminder', 'booking_completed',
  'booking_rescheduled', 'booking_approved', 'booking_rejected', 'booking_deleted', 'booking_archived', 'booking_restored',
  'booking_escalated', 'booking_deescalated',
  
  -- Payment notifications
  'payment_created', 'payment_pending', 'payment_processing', 'payment_completed', 'payment_failed', 'payment_refunded',
  'payment_cancelled', 'payment_disputed', 'payment_chargeback', 'payment_reminder', 'payment_overdue', 'payment_received',
  'payment_sent', 'payment_approved', 'payment_rejected',
  
  -- Invoice notifications
  'invoice_created', 'invoice_sent', 'invoice_viewed', 'invoice_paid', 'invoice_overdue', 'invoice_reminder',
  'invoice_cancelled', 'invoice_refunded', 'invoice_disputed', 'invoice_updated', 'invoice_deleted',
  
  -- Service notifications
  'service_created', 'service_updated', 'service_published', 'service_unpublished', 'service_deleted', 'service_archived',
  'service_restored', 'service_featured', 'service_unfeatured', 'service_approved', 'service_rejected', 'service_suspended',
  'service_reactivated',
  
  -- User notifications
  'user_registered', 'user_verified', 'user_updated', 'user_deleted', 'user_suspended', 'user_reactivated',
  'user_password_changed', 'user_email_changed', 'user_profile_updated', 'user_preferences_updated', 'user_role_changed',
  'user_permissions_updated',
  
  -- Message notifications
  'message_received', 'message_sent', 'message_read', 'message_deleted', 'message_archived', 'message_restored',
  'message_flagged', 'message_unflagged', 'message_priority_changed',
  
  -- Review notifications
  'review_received', 'review_updated', 'review_deleted', 'review_approved', 'review_rejected', 'review_flagged',
  'review_unflagged', 'review_response_received', 'review_response_updated', 'review_response_deleted',
  
  -- Document notifications
  'document_uploaded', 'document_downloaded', 'document_shared', 'document_deleted', 'document_updated',
  'document_approved', 'document_rejected', 'document_expired', 'document_reminder', 'document_archived', 'document_restored',
  
  -- System notifications
  'system_maintenance', 'system_update', 'system_error', 'system_warning', 'system_info', 'system_alert',
  'system_emergency', 'system_scheduled_downtime', 'system_backup_completed', 'system_backup_failed',
  'system_restore_completed', 'system_restore_failed',
  
  -- Security notifications
  'security_login_success', 'security_login_failed', 'security_logout', 'security_password_reset', 'security_email_verification',
  'security_two_factor_enabled', 'security_two_factor_disabled', 'security_suspicious_activity', 'security_account_locked',
  'security_account_unlocked', 'security_permission_denied', 'security_data_breach',
  
  -- Analytics notifications
  'analytics_report_ready', 'analytics_insight_available', 'analytics_goal_achieved', 'analytics_goal_missed',
  'analytics_trend_detected', 'analytics_anomaly_detected', 'analytics_performance_alert', 'analytics_capacity_warning',
  
  -- Integration notifications
  'integration_connected', 'integration_disconnected', 'integration_sync_success', 'integration_sync_failed',
  'integration_error', 'integration_updated', 'integration_deleted', 'integration_webhook_received', 'integration_webhook_failed',
  'integration_api_limit_reached', 'integration_api_limit_reset',
  
  -- Marketing notifications
  'marketing_campaign_created', 'marketing_campaign_started', 'marketing_campaign_paused', 'marketing_campaign_resumed',
  'marketing_campaign_completed', 'marketing_campaign_cancelled', 'marketing_email_sent', 'marketing_email_delivered',
  'marketing_email_opened', 'marketing_email_clicked', 'marketing_email_bounced', 'marketing_email_unsubscribed',
  'marketing_lead_created', 'marketing_lead_qualified', 'marketing_lead_converted', 'marketing_lead_lost',
  
  -- Support notifications
  'support_ticket_created', 'support_ticket_updated', 'support_ticket_assigned', 'support_ticket_resolved',
  'support_ticket_closed', 'support_ticket_reopened', 'support_ticket_escalated', 'support_ticket_priority_changed',
  'support_ticket_comment_added', 'support_ticket_attachment_added', 'support_ticket_satisfaction_survey',
  
  -- Compliance notifications
  'compliance_audit_started', 'compliance_audit_completed', 'compliance_audit_failed', 'compliance_violation_detected',
  'compliance_violation_resolved', 'compliance_certificate_expiring', 'compliance_certificate_expired',
  'compliance_certificate_renewed', 'compliance_policy_updated', 'compliance_training_required', 'compliance_training_completed',
  'compliance_deadline_approaching', 'compliance_deadline_missed',
  
  -- Workflow notifications
  'workflow_started', 'workflow_paused', 'workflow_resumed', 'workflow_completed', 'workflow_cancelled', 'workflow_failed',
  'workflow_step_completed', 'workflow_step_failed', 'workflow_approval_required', 'workflow_approval_granted',
  'workflow_approval_denied', 'workflow_escalated', 'workflow_deescalated',
  
  -- Custom notifications
  'custom_event', 'custom_alert', 'custom_reminder', 'custom_announcement', 'custom_update', 'custom_warning',
  'custom_success', 'custom_error', 'custom_info', 'custom_debug'
));

-- Verify the constraint was added
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass
AND conname LIKE '%type%';

-- Success message
SELECT '✅ Notification types updated successfully! All new notification types are now supported.' as status;
