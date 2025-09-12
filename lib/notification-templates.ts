import { NotificationTemplate, NotificationType } from '@/types/notifications'

const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
  // Task notifications
  task_created: {
    type: 'task_created',
    title_template: 'New Task: {{task_title}}',
    message_template: 'A new task "{{task_title}}" has been created in {{milestone_title}} by {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Task'
  },
  task_updated: {
    type: 'task_updated',
    title_template: 'Task Updated: {{task_title}}',
    message_template: 'Task "{{task_title}}" in {{milestone_title}} has been updated by {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Task'
  },
  task_completed: {
    type: 'task_completed',
    title_template: 'Task Completed: {{task_title}}',
    message_template: 'Task "{{task_title}}" in {{milestone_title}} has been completed by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Task'
  },
  task_overdue: {
    type: 'task_overdue',
    title_template: 'Overdue Task: {{task_title}}',
    message_template: 'Task "{{task_title}}" in {{milestone_title}} is overdue and needs attention.',
    priority: 'urgent',
    default_expires_in_hours: 24, // 1 day
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Task'
  },
  task_assigned: {
    type: 'task_assigned',
    title_template: 'Task Assigned: {{task_title}}',
    message_template: 'You have been assigned task "{{task_title}}" in {{milestone_title}} by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Task'
  },
  task_comment: {
    type: 'task_comment',
    title_template: 'New Comment on Task: {{task_title}}',
    message_template: '{{actor_name}} commented on task "{{task_title}}" in {{milestone_title}}.',
    priority: 'normal',
    default_expires_in_hours: 48, // 2 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Task'
  },

  // Milestone notifications
  milestone_created: {
    type: 'milestone_created',
    title_template: 'New Milestone: {{milestone_title}}',
    message_template: 'A new milestone "{{milestone_title}}" has been created for {{project_name}} by {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Milestone'
  },
  milestone_updated: {
    type: 'milestone_updated',
    title_template: 'Milestone Updated: {{milestone_title}}',
    message_template: 'Milestone "{{milestone_title}}" for {{project_name}} has been updated by {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Milestone'
  },
  milestone_completed: {
    type: 'milestone_completed',
    title_template: 'Milestone Completed: {{milestone_title}}',
    message_template: 'Milestone "{{milestone_title}}" for {{project_name}} has been completed by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Milestone'
  },
  milestone_overdue: {
    type: 'milestone_overdue',
    title_template: 'Overdue Milestone: {{milestone_title}}',
    message_template: 'Milestone "{{milestone_title}}" for {{project_name}} is overdue and needs attention.',
    priority: 'urgent',
    default_expires_in_hours: 24, // 1 day
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Milestone'
  },
  milestone_approved: {
    type: 'milestone_approved',
    title_template: 'Milestone Approved: {{milestone_title}}',
    message_template: 'Milestone "{{milestone_title}}" for {{project_name}} has been approved by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Milestone'
  },
  milestone_rejected: {
    type: 'milestone_rejected',
    title_template: 'Milestone Rejected: {{milestone_title}}',
    message_template: 'Milestone "{{milestone_title}}" for {{project_name}} has been rejected by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/bookings/{{booking_id}}/milestones',
    action_label: 'View Milestone'
  },

  // Booking notifications
  booking_created: {
    type: 'booking_created',
    title_template: 'New Booking: {{booking_title}}',
    message_template: 'A new booking "{{booking_title}}" for {{service_name}} has been created by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}',
    action_label: 'View Booking'
  },
  booking_updated: {
    type: 'booking_updated',
    title_template: 'Booking Updated: {{booking_title}}',
    message_template: 'Booking "{{booking_title}}" for {{service_name}} has been updated by {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/bookings/{{booking_id}}',
    action_label: 'View Booking'
  },
  booking_cancelled: {
    type: 'booking_cancelled',
    title_template: 'Booking Cancelled: {{booking_title}}',
    message_template: 'Booking "{{booking_title}}" for {{service_name}} has been cancelled by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/bookings/{{booking_id}}',
    action_label: 'View Booking'
  },
  booking_confirmed: {
    type: 'booking_confirmed',
    title_template: 'Booking Confirmed: {{booking_title}}',
    message_template: 'Booking "{{booking_title}}" for {{service_name}} has been confirmed by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}',
    action_label: 'View Booking'
  },
  booking_approved: {
    type: 'booking_approved',
    title_template: 'Booking Approved: {{booking_title}}',
    message_template: 'Your booking "{{booking_title}}" for {{service_name}} has been approved by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}',
    action_label: 'View Booking'
  },
  booking_reminder: {
    type: 'booking_reminder',
    title_template: 'Booking Reminder: {{booking_title}}',
    message_template: 'Reminder: Your booking "{{booking_title}}" for {{service_name}} is scheduled for {{scheduled_date}}.',
    priority: 'normal',
    default_expires_in_hours: 24, // 1 day
    action_url_template: '/dashboard/bookings/{{booking_id}}',
    action_label: 'View Booking'
  },
  booking_completed: {
    type: 'booking_completed',
    title_template: 'Booking Completed: {{booking_title}}',
    message_template: 'Booking "{{booking_title}}" for {{service_name}} has been completed by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/bookings/{{booking_id}}',
    action_label: 'View Booking'
  },

  // Payment notifications
  payment_received: {
    type: 'payment_received',
    title_template: 'Payment Received: {{amount}} {{currency}}',
    message_template: 'Payment of {{amount}} {{currency}} has been received for {{booking_title}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/invoices',
    action_label: 'View Invoice'
  },
  payment_failed: {
    type: 'payment_failed',
    title_template: 'Payment Failed: {{amount}} {{currency}}',
    message_template: 'Payment of {{amount}} {{currency}} for {{booking_title}} has failed. Please try again.',
    priority: 'urgent',
    default_expires_in_hours: 24, // 1 day
    action_url_template: '/dashboard/invoices',
    action_label: 'View Invoice'
  },

  // Invoice notifications
  invoice_created: {
    type: 'invoice_created',
    title_template: 'New Invoice: {{invoice_number}}',
    message_template: 'A new invoice {{invoice_number}} has been created for {{booking_title}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/invoices',
    action_label: 'View Invoice'
  },
  invoice_overdue: {
    type: 'invoice_overdue',
    title_template: 'Overdue Invoice: {{invoice_number}}',
    message_template: 'Invoice {{invoice_number}} for {{booking_title}} is overdue. Please pay immediately.',
    priority: 'urgent',
    default_expires_in_hours: 24, // 1 day
    action_url_template: '/dashboard/invoices',
    action_label: 'View Invoice'
  },
  invoice_paid: {
    type: 'invoice_paid',
    title_template: 'Invoice Paid: {{invoice_number}}',
    message_template: 'Invoice {{invoice_number}} for {{booking_title}} has been paid.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/invoices',
    action_label: 'View Invoice'
  },

  // Request notifications
  request_created: {
    type: 'request_created',
    title_template: 'New Request: {{request_type}}',
    message_template: 'A new {{request_type}} request has been created by {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/requests',
    action_label: 'View Request'
  },
  request_updated: {
    type: 'request_updated',
    title_template: 'Request Updated: {{request_type}}',
    message_template: '{{request_type}} request has been updated by {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 48, // 2 days
    action_url_template: '/dashboard/requests',
    action_label: 'View Request'
  },
  request_approved: {
    type: 'request_approved',
    title_template: 'Request Approved: {{request_type}}',
    message_template: 'Your {{request_type}} request has been approved by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/requests',
    action_label: 'View Request'
  },
  request_rejected: {
    type: 'request_rejected',
    title_template: 'Request Rejected: {{request_type}}',
    message_template: 'Your {{request_type}} request has been rejected by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/requests',
    action_label: 'View Request'
  },

  // Message notifications
  message_received: {
    type: 'message_received',
    title_template: 'New Message from {{sender_name}}',
    message_template: 'You have received a new message from {{sender_name}}.',
    priority: 'normal',
    default_expires_in_hours: 48, // 2 days
    action_url_template: '/dashboard/messages',
    action_label: 'View Message'
  },

  // Document notifications
  document_uploaded: {
    type: 'document_uploaded',
    title_template: 'Document Uploaded: {{document_name}}',
    message_template: 'Document "{{document_name}}" has been uploaded by {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/documents',
    action_label: 'View Document'
  },
  document_approved: {
    type: 'document_approved',
    title_template: 'Document Approved: {{document_name}}',
    message_template: 'Document "{{document_name}}" has been approved by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/documents',
    action_label: 'View Document'
  },
  document_rejected: {
    type: 'document_rejected',
    title_template: 'Document Rejected: {{document_name}}',
    message_template: 'Document "{{document_name}}" has been rejected by {{actor_name}}.',
    priority: 'high',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/documents',
    action_label: 'View Document'
  },

  // System notifications
  system_announcement: {
    type: 'system_announcement',
    title_template: 'System Announcement',
    message_template: '{{message}}',
    priority: 'normal',
    default_expires_in_hours: 168, // 7 days
    action_url_template: '/dashboard/notifications',
    action_label: 'View Details'
  },
  maintenance_scheduled: {
    type: 'maintenance_scheduled',
    title_template: 'Scheduled Maintenance',
    message_template: 'System maintenance is scheduled for {{maintenance_date}}. {{description}}',
    priority: 'high',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/notifications',
    action_label: 'View Details'
  },

  // Project notifications
  deadline_approaching: {
    type: 'deadline_approaching',
    title_template: 'Deadline Approaching: {{project_name}}',
    message_template: 'Project "{{project_name}}" deadline is approaching on {{deadline_date}}.',
    priority: 'high',
    default_expires_in_hours: 24, // 1 day
    action_url_template: '/dashboard/projects/{{project_id}}',
    action_label: 'View Project'
  },
  project_delayed: {
    type: 'project_delayed',
    title_template: 'Project Delayed: {{project_name}}',
    message_template: 'Project "{{project_name}}" has been delayed. {{reason}}',
    priority: 'high',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/projects/{{project_id}}',
    action_label: 'View Project'
  },
  client_feedback: {
    type: 'client_feedback',
    title_template: 'Client Feedback: {{project_name}}',
    message_template: 'New feedback received for project "{{project_name}}" from {{actor_name}}.',
    priority: 'normal',
    default_expires_in_hours: 72, // 3 days
    action_url_template: '/dashboard/projects/{{project_id}}',
    action_label: 'View Project'
  },
  team_mention: {
    type: 'team_mention',
    title_template: 'You were mentioned',
    message_template: '{{actor_name}} mentioned you in {{entity_type}}.',
    priority: 'normal',
    default_expires_in_hours: 48, // 2 days
    action_url_template: '/dashboard/{{entity_type}}/{{entity_id}}',
    action_label: 'View Details'
  }
}

export function getNotificationTemplate(type: NotificationType): NotificationTemplate {
  return notificationTemplates[type]
}

export function getAllNotificationTemplates(): Record<NotificationType, NotificationTemplate> {
  return notificationTemplates
}

export function getNotificationTypesByCategory() {
  return {
    tasks: [
      'task_created', 'task_updated', 'task_completed', 'task_overdue', 'task_assigned', 'task_comment'
    ] as NotificationType[],
    milestones: [
      'milestone_created', 'milestone_updated', 'milestone_completed', 'milestone_overdue', 'milestone_approved', 'milestone_rejected'
    ] as NotificationType[],
    bookings: [
      'booking_created', 'booking_updated', 'booking_cancelled', 'booking_confirmed', 'booking_approved', 'booking_reminder', 'booking_completed'
    ] as NotificationType[],
    payments: [
      'payment_received', 'payment_failed'
    ] as NotificationType[],
    invoices: [
      'invoice_created', 'invoice_overdue', 'invoice_paid'
    ] as NotificationType[],
    requests: [
      'request_created', 'request_updated', 'request_approved', 'request_rejected'
    ] as NotificationType[],
    messages: [
      'message_received'
    ] as NotificationType[],
    documents: [
      'document_uploaded', 'document_approved', 'document_rejected'
    ] as NotificationType[],
    system: [
      'system_announcement', 'maintenance_scheduled'
    ] as NotificationType[],
    projects: [
      'deadline_approaching', 'project_delayed', 'client_feedback', 'team_mention'
    ] as NotificationType[]
  }
}

// Export the templates object for direct access
export { notificationTemplates }