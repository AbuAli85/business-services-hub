export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: NotificationData
  read: boolean
  priority: NotificationPriority
  created_at: string
  updated_at: string
  expires_at?: string
  action_url?: string
  action_label?: string
}

export type NotificationType = 
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_overdue'
  | 'task_assigned'
  | 'task_comment'
  | 'milestone_created'
  | 'milestone_updated'
  | 'milestone_completed'
  | 'milestone_overdue'
  | 'milestone_approved'
  | 'milestone_rejected'
  | 'booking_created'
  | 'booking_updated'
  | 'booking_cancelled'
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'booking_completed'
  | 'payment_received'
  | 'payment_failed'
  | 'invoice_created'
  | 'invoice_overdue'
  | 'invoice_paid'
  | 'request_created'
  | 'request_updated'
  | 'request_approved'
  | 'request_rejected'
  | 'message_received'
  | 'document_uploaded'
  | 'document_approved'
  | 'document_rejected'
  | 'system_announcement'
  | 'maintenance_scheduled'
  | 'deadline_approaching'
  | 'project_delayed'
  | 'client_feedback'
  | 'team_mention'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface NotificationData {
  // Task related
  task_id?: string
  task_title?: string
  milestone_id?: string
  milestone_title?: string
  
  // Booking related
  booking_id?: string
  booking_title?: string
  service_name?: string
  service_title?: string
  status?: string
  
  // Payment related
  payment_id?: string
  amount?: number
  currency?: string
  payment_method?: string
  transaction_id?: string
  
  // Invoice related
  invoice_id?: string
  invoice_number?: string
  due_date?: string
  
  // Request related
  request_id?: string
  request_type?: string
  
  // Message related
  message_id?: string
  sender_id?: string
  sender_name?: string
  
  // Document related
  document_id?: string
  document_name?: string
  
  // Project related
  project_id?: string
  project_name?: string
  scheduled_date?: string
  
  // User related
  actor_id?: string
  actor_name?: string
  actor_role?: string
  
  // Generic
  entity_id?: string
  entity_type?: string
  metadata?: Record<string, any>
}

export interface NotificationSettings {
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  sms_notifications: boolean
  notification_types: Record<NotificationType, boolean>
  quiet_hours_start?: string // HH:MM format
  quiet_hours_end?: string // HH:MM format
  digest_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  created_at: string
  updated_at: string
}

export interface NotificationTemplate {
  type: NotificationType
  title_template: string
  message_template: string
  priority: NotificationPriority
  default_expires_in_hours?: number
  action_url_template?: string
  action_label?: string
}

export interface NotificationStats {
  total: number
  unread: number
  by_type: Record<NotificationType, number>
  by_priority: Record<NotificationPriority, number>
  recent_count: number // last 24 hours
}

export interface NotificationFilters {
  type?: NotificationType
  priority?: NotificationPriority
  read?: boolean
  date_from?: string
  date_to?: string
  search?: string
}

export interface NotificationBulkAction {
  action: 'mark_read' | 'mark_unread' | 'delete' | 'archive'
  notification_ids: string[]
}
