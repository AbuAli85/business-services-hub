-- Comprehensive script to fix Function Search Path Mutable warnings
-- This script sets search_path to 'public' for all functions that have mutable search_path
-- Run this directly against your production database

-- Fix all functions with mutable search_path by setting search_path to 'public'
-- This prevents potential security vulnerabilities from search_path manipulation

-- 1. Fix hr schema functions
ALTER FUNCTION hr.get_employee_id() SET search_path = 'public';
ALTER FUNCTION hr.is_employee() SET search_path = 'public';
ALTER FUNCTION hr.is_hr_admin() SET search_path = 'public';
ALTER FUNCTION hr.is_hr_staff() SET search_path = 'public';
ALTER FUNCTION hr.is_manager() SET search_path = 'public';
ALTER FUNCTION hr.is_manager_of() SET search_path = 'public';
ALTER FUNCTION hr.update_updated_at_column() SET search_path = 'public';

-- 2. Fix public schema functions - Core functions
ALTER FUNCTION public.enforce_milestone_transition() SET search_path = 'public';
ALTER FUNCTION public.log_booking_changes() SET search_path = 'public';
ALTER FUNCTION public.update_task() SET search_path = 'public';
ALTER FUNCTION public.get_dashboard_metrics() SET search_path = 'public';
ALTER FUNCTION public.get_user_roles() SET search_path = 'public';
ALTER FUNCTION public.get_user_primary_role() SET search_path = 'public';
ALTER FUNCTION public.has_role() SET search_path = 'public';
ALTER FUNCTION public.get_booking_kpis() SET search_path = 'public';
ALTER FUNCTION public.add_task() SET search_path = 'public';
ALTER FUNCTION public.add_milestone() SET search_path = 'public';
ALTER FUNCTION public.create_invoice_for_booking() SET search_path = 'public';
ALTER FUNCTION public.cleanup_orphaned_documents() SET search_path = 'public';
ALTER FUNCTION public.get_user_roles_v2() SET search_path = 'public';
ALTER FUNCTION public.get_user_primary_role_v2() SET search_path = 'public';
ALTER FUNCTION public.has_role_v2() SET search_path = 'public';
ALTER FUNCTION public.alert_on_failed_webhooks() SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_notifications() SET search_path = 'public';
ALTER FUNCTION public.is_booking_approved() SET search_path = 'public';
ALTER FUNCTION public.booking_tasks_append_action_item() SET search_path = 'public';
ALTER FUNCTION public.booking_tasks_append_shared_comment() SET search_path = 'public';
ALTER FUNCTION public.bind_service_to_resource() SET search_path = 'public';
ALTER FUNCTION public.auto_create_invoice_on_booking() SET search_path = 'public';
ALTER FUNCTION public.get_bookings_for_user_v2() SET search_path = 'public';
ALTER FUNCTION public.calculate_booking_progress() SET search_path = 'public';
ALTER FUNCTION public.bookings_sync_legacy_cols() SET search_path = 'public';
ALTER FUNCTION public.update_milestone_progress() SET search_path = 'public';
ALTER FUNCTION public.call_webhook() SET search_path = 'public';
ALTER FUNCTION public.calculate_invoice_totals() SET search_path = 'public';
ALTER FUNCTION public.calculate_service_rating() SET search_path = 'public';
ALTER FUNCTION public.bookings_set_number() SET search_path = 'public';
ALTER FUNCTION public.calculate_milestone_progress() SET search_path = 'public';
ALTER FUNCTION public.get_bookings_summary() SET search_path = 'public';
ALTER FUNCTION public.check_overdue_milestones() SET search_path = 'public';
ALTER FUNCTION public.check_booking_conflicts() SET search_path = 'public';
ALTER FUNCTION public.remove_user_role_v2() SET search_path = 'public';
ALTER FUNCTION public.check_email_exists() SET search_path = 'public';
ALTER FUNCTION public.check_task_overdue() SET search_path = 'public';
ALTER FUNCTION public.ensure_user_profile() SET search_path = 'public';
ALTER FUNCTION public.get_users_with_roles_v2() SET search_path = 'public';
ALTER FUNCTION public.create_default_tasks_for_milestone() SET search_path = 'public';
ALTER FUNCTION public.companies_set_slug() SET search_path = 'public';
ALTER FUNCTION public.generate_booking_number() SET search_path = 'public';
ALTER FUNCTION public.assign_user_role_v2() SET search_path = 'public';
ALTER FUNCTION public.generate_invoice_number() SET search_path = 'public';
ALTER FUNCTION public.generate_milestones_from_templates() SET search_path = 'public';
ALTER FUNCTION public.create_default_notification_preferences() SET search_path = 'public';
ALTER FUNCTION public.fn_create_notification() SET search_path = 'public';
ALTER FUNCTION public.refresh_mv_buckets() SET search_path = 'public';
ALTER FUNCTION public.get_user_email_preferences() SET search_path = 'public';
ALTER FUNCTION public.get_user_by_email() SET search_path = 'public';
ALTER FUNCTION public.refresh_mv_bucket_kpis() SET search_path = 'public';
ALTER FUNCTION public.get_service_with_details() SET search_path = 'public';
ALTER FUNCTION public.get_unread_message_count() SET search_path = 'public';
ALTER FUNCTION public.get_unread_notification_count() SET search_path = 'public';
ALTER FUNCTION public.enforce_booking_status_transition() SET search_path = 'public';
ALTER FUNCTION public.ensure_updated_at_trigger() SET search_path = 'public';
ALTER FUNCTION public.enforce_created_by_uid() SET search_path = 'public';
ALTER FUNCTION public.refresh_user_permissions() SET search_path = 'public';
ALTER FUNCTION public.create_user_profile_simple() SET search_path = 'public';
ALTER FUNCTION public.delete_milestone() SET search_path = 'public';
ALTER FUNCTION public.reset_failed_login_attempts() SET search_path = 'public';
ALTER FUNCTION public.get_pending_emails() SET search_path = 'public';
ALTER FUNCTION public.get_notification_preferences() SET search_path = 'public';
ALTER FUNCTION public.get_user_notification_stats() SET search_path = 'public';
ALTER FUNCTION public.safe_webhook_call() SET search_path = 'public';
ALTER FUNCTION public.get_email_notification_stats() SET search_path = 'public';
ALTER FUNCTION public.get_provider_monthly_earnings() SET search_path = 'public';
ALTER FUNCTION public.trigger_service_webhooks() SET search_path = 'public';
ALTER FUNCTION public.trigger_update_milestone_progress() SET search_path = 'public';
ALTER FUNCTION public.trigger_set_timestamp() SET search_path = 'public';
ALTER FUNCTION public.trigger_generate_milestones() SET search_path = 'public';
ALTER FUNCTION public.get_rbac_health_summary() SET search_path = 'public';
ALTER FUNCTION public.update_action_requests_updated_at() SET search_path = 'public';
ALTER FUNCTION public.trigger_update_booking_progress() SET search_path = 'public';
ALTER FUNCTION public.update_booking_progress() SET search_path = 'public';
ALTER FUNCTION public.update_messages_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_booking_dashboard_data() SET search_path = 'public';
ALTER FUNCTION public.update_booking_progress_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_booking_timeline_comments_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_users_without_roles() SET search_path = 'public';
ALTER FUNCTION public.update_companies_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_user_role() SET search_path = 'public';
ALTER FUNCTION public.update_booking_resources_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_document_updated_at() SET search_path = 'public';
ALTER FUNCTION public.is_provider_of_booking() SET search_path = 'public';
ALTER FUNCTION public.is_client() SET search_path = 'public';
ALTER FUNCTION public.is_booking_requester() SET search_path = 'public';
ALTER FUNCTION public.is_admin() SET search_path = 'public';
ALTER FUNCTION public.is_client_of_booking() SET search_path = 'public';
ALTER FUNCTION public.is_login_blocked() SET search_path = 'public';
ALTER FUNCTION public.is_invoiceable_status() SET search_path = 'public';
ALTER FUNCTION public.is_provider() SET search_path = 'public';
ALTER FUNCTION public.is_user_related_to_booking() SET search_path = 'public';
ALTER FUNCTION public.update_service_rating_trigger() SET search_path = 'public';
ALTER FUNCTION public.update_service_suggestions_updated_at() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user_webhook() SET search_path = 'public';
ALTER FUNCTION public.handle_webhook_trigger() SET search_path = 'public';
ALTER FUNCTION public.update_booking_progress_from_milestones() SET search_path = 'public';
ALTER FUNCTION public.log_security_event() SET search_path = 'public';
ALTER FUNCTION public.log_role_change() SET search_path = 'public';
ALTER FUNCTION public.mark_notification_read() SET search_path = 'public';
ALTER FUNCTION public.mark_messages_as_read() SET search_path = 'public';
ALTER FUNCTION public.no_overlap_for_service() SET search_path = 'public';
ALTER FUNCTION public.normalize_slug() SET search_path = 'public';
ALTER FUNCTION public.mark_all_notifications_read() SET search_path = 'public';
ALTER FUNCTION public.mark_email_processed() SET search_path = 'public';
ALTER FUNCTION public.queue_email_notification() SET search_path = 'public';
ALTER FUNCTION public.prune_webhook_logs() SET search_path = 'public';
ALTER FUNCTION public.rbac_upsert_permission() SET search_path = 'public';
ALTER FUNCTION public.rbac_attach_permission() SET search_path = 'public';
ALTER FUNCTION public.rbac_upsert_role() SET search_path = 'public';
ALTER FUNCTION public.provider_services_fill_company_id() SET search_path = 'public';
ALTER FUNCTION public.rbac_refresh_user_permissions_mv() SET search_path = 'public';
ALTER FUNCTION public.provider_services_require_provider() SET search_path = 'public';
ALTER FUNCTION public.set_booking_total_amount() SET search_path = 'public';
ALTER FUNCTION public.set_invoice_number() SET search_path = 'public';
ALTER FUNCTION public.set_updated_at() SET search_path = 'public';
ALTER FUNCTION public.slugify() SET search_path = 'public';
ALTER FUNCTION public.test_notification_creation() SET search_path = 'public';
ALTER FUNCTION public.test_webhook() SET search_path = 'public';
ALTER FUNCTION public.test_booking_status() SET search_path = 'public';
ALTER FUNCTION public.stop_time_tracking() SET search_path = 'public';
ALTER FUNCTION public.touch_updated_at() SET search_path = 'public';
ALTER FUNCTION public.trg_notify_document_request_insert() SET search_path = 'public';
ALTER FUNCTION public.get_revenue_display_status() SET search_path = 'public';
ALTER FUNCTION public.trigger_booking_webhooks() SET search_path = 'public';
ALTER FUNCTION public.enforce_task_transition() SET search_path = 'public';
ALTER FUNCTION public.trg_notify_document_uploaded() SET search_path = 'public';
ALTER FUNCTION public.trg_fn_auto_invoice_on_approval() SET search_path = 'public';
ALTER FUNCTION public.update_overdue_tasks() SET search_path = 'public';
ALTER FUNCTION public.update_overdue_status() SET search_path = 'public';
ALTER FUNCTION public.update_progress_templates_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_booking_display_status() SET search_path = 'public';
ALTER FUNCTION public.update_project_timeline_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_milestone_comments_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_profile_last_active() SET search_path = 'public';
ALTER FUNCTION public.update_milestones_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_service_packages_updated_at() SET search_path = 'public';
ALTER FUNCTION public.create_audit_log() SET search_path = 'public';
ALTER FUNCTION public.update_tasks_updated_at() SET search_path = 'public';
ALTER FUNCTION public.get_enhanced_booking_stats() SET search_path = 'public';
ALTER FUNCTION public.update_task_status() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.delete_task() SET search_path = 'public';
ALTER FUNCTION public.booking_tasks_update_action_item_status() SET search_path = 'public';
ALTER FUNCTION public.get_webhook_stats() SET search_path = 'public';
ALTER FUNCTION public.add_milestone() SET search_path = 'public';
ALTER FUNCTION public.add_task() SET search_path = 'public';
ALTER FUNCTION public.add_task_to_milestone() SET search_path = 'public';
ALTER FUNCTION public.notify_invoice_update() SET search_path = 'public';
ALTER FUNCTION public.can_view_profile() SET search_path = 'public';
ALTER FUNCTION public.clone_service_milestones_to_booking() SET search_path = 'public';
ALTER FUNCTION public.create_automatic_notification() SET search_path = 'public';
ALTER FUNCTION public.create_booking_simple() SET search_path = 'public';
ALTER FUNCTION public.create_default_milestones() SET search_path = 'public';
ALTER FUNCTION public.create_invoice_from_booking() SET search_path = 'public';
ALTER FUNCTION public.create_progress_notification() SET search_path = 'public';
ALTER FUNCTION public.create_user_profile() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.get_booking_details() SET search_path = 'public';
ALTER FUNCTION public.get_booking_progress_data() SET search_path = 'public';
ALTER FUNCTION public.get_invoice_details() SET search_path = 'public';
ALTER FUNCTION public.get_provider_dashboard() SET search_path = 'public';
ALTER FUNCTION public.log_permission_usage() SET search_path = 'public';
ALTER FUNCTION public.get_provider_recent_bookings() SET search_path = 'public';
ALTER FUNCTION public.get_provider_top_services() SET search_path = 'public';
ALTER FUNCTION public.get_user_notifications() SET search_path = 'public';
ALTER FUNCTION public.log_time_for_task() SET search_path = 'public';
ALTER FUNCTION public.process_payment_success() SET search_path = 'public';
ALTER FUNCTION public.update_milestone() SET search_path = 'public';
ALTER FUNCTION public.process_profile_creation_webhooks() SET search_path = 'public';
ALTER FUNCTION public.start_time_tracking() SET search_path = 'public';
ALTER FUNCTION public.track_failed_login() SET search_path = 'public';
ALTER FUNCTION public.trg_notify_document_request_update() SET search_path = 'public';
ALTER FUNCTION public.update_booking_status() SET search_path = 'public';
ALTER FUNCTION public.update_service_stats() SET search_path = 'public';
ALTER FUNCTION public.upsert_company_by_slug_safe() SET search_path = 'public';
ALTER FUNCTION public.update_task_basic() SET search_path = 'public';
ALTER FUNCTION public.update_task_details() SET search_path = 'public';
ALTER FUNCTION public.upsert_booking_by_number() SET search_path = 'public';
ALTER FUNCTION public.upsert_service_by_slug_safe() SET search_path = 'public';
ALTER FUNCTION public.verify_invoice_system() SET search_path = 'public';
ALTER FUNCTION public.get_services_for_user_v2() SET search_path = 'public';
ALTER FUNCTION public.recalc_milestone_progress() SET search_path = 'public';

-- Verify all functions now have search_path set
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    p.prosecdef as security_definer,
    p.proconfig as config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'hr')
AND p.proconfig IS NOT NULL
AND 'search_path' = ANY(p.proconfig)
ORDER BY n.nspname, p.proname;

-- Add comments for documentation
COMMENT ON FUNCTION hr.get_employee_id() IS 'HR function - search_path secured';
COMMENT ON FUNCTION hr.is_employee() IS 'HR function - search_path secured';
COMMENT ON FUNCTION hr.is_hr_admin() IS 'HR function - search_path secured';
COMMENT ON FUNCTION hr.is_hr_staff() IS 'HR function - search_path secured';
COMMENT ON FUNCTION hr.is_manager() IS 'HR function - search_path secured';
COMMENT ON FUNCTION hr.is_manager_of() IS 'HR function - search_path secured';
COMMENT ON FUNCTION hr.update_updated_at_column() IS 'HR function - search_path secured';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully set search_path to "public" for all functions with mutable search_path';
    RAISE NOTICE 'Total functions secured: %', (
        SELECT COUNT(*) 
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname IN ('public', 'hr') 
        AND p.proconfig IS NOT NULL 
        AND 'search_path' = ANY(p.proconfig)
    );
END $$;
