<<<<<<< HEAD
import { Notification, NotificationType, NotificationData } from '@/types/notifications'
import { getSupabaseClient } from './supabase'

export type EmailTemplateStyle = 'modern' | 'minimal' | 'corporate'
export type EmailSendPreference = 'immediate' | 'daily_digest' | 'weekly_digest' | 'never'

class EmailNotificationService {
  private static instance: EmailNotificationService
  private supabase: any

  private constructor() {
=======
import { Notification, NotificationType } from '@/types/notifications'
import { getSupabaseClient } from './supabase'

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailNotificationData {
  to: string
  toName?: string
  from?: string
  fromName?: string
  replyTo?: string
  template: EmailTemplate
  data?: Record<string, any>
  attachments?: Array<{
    filename: string
    content: string | Buffer
    contentType: string
  }>
}

export class EmailNotificationService {
  private static instance: EmailNotificationService
  private supabase: any

  constructor() {
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
    this.supabase = getSupabaseClient()
  }

  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService()
    }
    return EmailNotificationService.instance
  }

<<<<<<< HEAD
  async sendEmailNotification(
    notification: Notification,
    recipientEmail: string,
    recipientName: string = 'User',
    templateStyle: EmailTemplateStyle = 'modern'
  ): Promise<boolean> {
    try {
      // Check if user has email notifications enabled
      const { data: preferences } = await this.supabase
        .from('user_email_preferences')
        .select('*')
        .eq('user_id', notification.user_id)
        .single()

      if (!preferences?.email_enabled) {
        console.log(`Email notifications disabled for user ${notification.user_id}`)
        return false
      }

      // Check if this notification type should send emails
      if (preferences?.disabled_types?.includes(notification.type)) {
        console.log(`Email notifications disabled for type ${notification.type}`)
        return false
      }

      // Generate email content
      const emailContent = this.generateEmailContent(notification, templateStyle)
      
      // Send email via Supabase Edge Function
      const { data, error } = await this.supabase.functions.invoke('send-email', {
        body: {
          to: recipientEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          notification_type: notification.type,
          notification_id: notification.id
=======
  /**
   * Send email notification for a given notification
   */
  async sendEmailNotification(notification: Notification, userEmail: string, userName?: string): Promise<boolean> {
    try {
      // Check if user has email notifications enabled
      const emailEnabled = await this.isEmailNotificationEnabled(notification.user_id, notification.type)
      if (!emailEnabled) {
        console.log(`Email notifications disabled for user ${notification.user_id} and type ${notification.type}`)
        return false
      }

      // Get email template for notification type
      const template = await this.getEmailTemplate(notification.type, notification)
      if (!template) {
        console.warn(`No email template found for notification type: ${notification.type}`)
        return false
      }

      // Prepare email data
      const emailData: EmailNotificationData = {
        to: userEmail,
        toName: userName,
        from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
        fromName: process.env.EMAIL_FROM_NAME || 'Your Business Services Hub',
        replyTo: process.env.EMAIL_REPLY_TO || 'support@yourdomain.com',
        template,
        data: {
          notification,
          userName: userName || 'User',
          userEmail,
          actionUrl: notification.action_url,
          actionLabel: notification.action_label,
          priority: notification.priority,
          createdAt: new Date(notification.created_at).toLocaleString(),
          expiresAt: notification.expires_at ? new Date(notification.expires_at).toLocaleString() : null
        }
      }

      // Send email
      const success = await this.sendEmail(emailData)
      
      if (success) {
        // Log email sent
        await this.logEmailSent(notification.id, userEmail, notification.type)
      }

      return success
    } catch (error) {
      console.error('Error sending email notification:', error)
      return false
    }
  }

  /**
   * Check if email notifications are enabled for user and notification type
   */
  private async isEmailNotificationEnabled(userId: string, notificationType: NotificationType): Promise<boolean> {
    try {
      const { data: settings } = await this.supabase
        .from('notification_settings')
        .select('email_notifications, notification_types')
        .eq('user_id', userId)
        .single()

      if (!settings) {
        // Default to enabled if no settings found
        return true
      }

      // Check if email notifications are enabled
      if (!settings.email_notifications) {
        return false
      }

      // Check if this notification type is enabled
      const enabledTypes = settings.notification_types || []
      return enabledTypes.includes(notificationType) || enabledTypes.length === 0
    } catch (error) {
      console.error('Error checking email notification settings:', error)
      return true // Default to enabled on error
    }
  }

  /**
   * Get email template for notification type
   */
  private async getEmailTemplate(notificationType: NotificationType, notification: Notification): Promise<EmailTemplate | null> {
    // Get user preferences for email template
    const templateStyle = await this.getUserEmailTemplateStyle(notification.user_id)
    
    // Generate template based on notification type
    switch (notificationType) {
      case 'booking_created':
        return this.getBookingCreatedTemplate(notification, templateStyle)
      case 'booking_updated':
        return this.getBookingUpdatedTemplate(notification, templateStyle)
      case 'booking_cancelled':
        return this.getBookingCancelledTemplate(notification, templateStyle)
      case 'booking_confirmed':
        return this.getBookingConfirmedTemplate(notification, templateStyle)
      case 'booking_reminder':
        return this.getBookingReminderTemplate(notification, templateStyle)
      case 'task_created':
        return this.getTaskCreatedTemplate(notification, templateStyle)
      case 'task_completed':
        return this.getTaskCompletedTemplate(notification, templateStyle)
      case 'milestone_completed':
        return this.getMilestoneCompletedTemplate(notification, templateStyle)
      case 'payment_received':
        return this.getPaymentReceivedTemplate(notification, templateStyle)
      case 'payment_failed':
        return this.getPaymentFailedTemplate(notification, templateStyle)
      case 'invoice_created':
        return this.getInvoiceCreatedTemplate(notification, templateStyle)
      case 'invoice_overdue':
        return this.getInvoiceOverdueTemplate(notification, templateStyle)
      default:
        return this.getDefaultTemplate(notification, templateStyle)
    }
  }

  /**
   * Get user's email template style preferences
   */
  private async getUserEmailTemplateStyle(userId: string): Promise<string> {
    try {
      const { data: settings } = await this.supabase
        .from('notification_settings')
        .select('email_template_style')
        .eq('user_id', userId)
        .single()

      return settings?.email_template_style || 'modern'
    } catch (error) {
      return 'modern'
    }
  }

  /**
   * Send email using configured email service
   */
  private async sendEmail(emailData: EmailNotificationData): Promise<boolean> {
    try {
      // Use Supabase Edge Function for email sending
      const { data, error } = await this.supabase.functions.invoke('send-email', {
        body: {
          to: emailData.to,
          toName: emailData.toName,
          from: emailData.from,
          fromName: emailData.fromName,
          replyTo: emailData.replyTo,
          subject: emailData.template.subject,
          html: emailData.template.html,
          text: emailData.template.text,
          data: emailData.data,
          attachments: emailData.attachments
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
        }
      })

      if (error) {
        console.error('Error sending email:', error)
        return false
      }

<<<<<<< HEAD
      // Log the email attempt
      await this.logEmailNotification(notification, recipientEmail, 'sent', data?.messageId)

      return true
    } catch (error) {
      console.error('Error in sendEmailNotification:', error)
      await this.logEmailNotification(notification, recipientEmail, 'failed', null, error.message)
=======
      return data?.success || false
    } catch (error) {
      console.error('Error sending email:', error)
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
      return false
    }
  }

<<<<<<< HEAD
  private generateEmailContent(
    notification: Notification,
    templateStyle: EmailTemplateStyle
  ): { subject: string; html: string; text: string } {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://marketing.thedigitalmorph.com'
    
    switch (notification.type) {
      case 'booking_created':
        return this.getBookingCreatedTemplate(notification, templateStyle, baseUrl)
      case 'booking_updated':
        return this.getBookingUpdatedTemplate(notification, templateStyle, baseUrl)
      case 'booking_cancelled':
        return this.getBookingCancelledTemplate(notification, templateStyle, baseUrl)
      case 'booking_confirmed':
        return this.getBookingConfirmedTemplate(notification, templateStyle, baseUrl)
      case 'booking_reminder':
        return this.getBookingReminderTemplate(notification, templateStyle, baseUrl)
      case 'booking_completed':
        return this.getBookingCompletedTemplate(notification, templateStyle, baseUrl)
      case 'task_created':
        return this.getTaskCreatedTemplate(notification, templateStyle, baseUrl)
      case 'task_updated':
        return this.getTaskUpdatedTemplate(notification, templateStyle, baseUrl)
      case 'task_completed':
        return this.getTaskCompletedTemplate(notification, templateStyle, baseUrl)
      case 'task_overdue':
        return this.getTaskOverdueTemplate(notification, templateStyle, baseUrl)
      case 'milestone_created':
        return this.getMilestoneCreatedTemplate(notification, templateStyle, baseUrl)
      case 'milestone_updated':
        return this.getMilestoneUpdatedTemplate(notification, templateStyle, baseUrl)
      case 'milestone_completed':
        return this.getMilestoneCompletedTemplate(notification, templateStyle, baseUrl)
      case 'milestone_overdue':
        return this.getMilestoneOverdueTemplate(notification, templateStyle, baseUrl)
      case 'payment_received':
        return this.getPaymentReceivedTemplate(notification, templateStyle, baseUrl)
      case 'payment_failed':
        return this.getPaymentFailedTemplate(notification, templateStyle, baseUrl)
      case 'invoice_created':
        return this.getInvoiceCreatedTemplate(notification, templateStyle, baseUrl)
      case 'invoice_overdue':
        return this.getInvoiceOverdueTemplate(notification, templateStyle, baseUrl)
      case 'invoice_paid':
        return this.getInvoicePaidTemplate(notification, templateStyle, baseUrl)
      default:
        return this.getDefaultTemplate(notification, templateStyle, baseUrl)
    }
  }

  private getBookingCreatedTemplate(
    notification: Notification,
    style: EmailTemplateStyle,
    baseUrl: string
  ): { subject: string; html: string; text: string } {
    const data = notification.data as any
    const subject = `New Booking: ${data.booking_title || 'Service Booking'}`
    
    const html = this.getEmailTemplate(style, {
      title: 'New Booking Created',
      message: `A new booking "${data.booking_title || 'Service Booking'}" has been created for service "${data.service_name || 'Service'}" on ${data.scheduled_date || 'TBD'}.`,
      actionUrl: `${baseUrl}/dashboard/bookings/${data.booking_id}`,
      actionLabel: 'View Booking',
      priority: notification.priority,
      notificationId: notification.id
    })

    const text = `New Booking: ${data.booking_title || 'Service Booking'}\n\nA new booking has been created for service "${data.service_name || 'Service'}" on ${data.scheduled_date || 'TBD'}.\n\nView Booking: ${baseUrl}/dashboard/bookings/${data.booking_id}`

    return { subject, html, text }
  }

  private getBookingConfirmedTemplate(
    notification: Notification,
    style: EmailTemplateStyle,
    baseUrl: string
  ): { subject: string; html: string; text: string } {
    const data = notification.data as any
    const subject = `Booking Confirmed: ${data.booking_title || 'Service Booking'}`
    
    const html = this.getEmailTemplate(style, {
      title: 'Booking Confirmed',
      message: `Your booking "${data.booking_title || 'Service Booking'}" has been confirmed and is ready to proceed.`,
      actionUrl: `${baseUrl}/dashboard/bookings/${data.booking_id}`,
      actionLabel: 'View Booking',
      priority: notification.priority,
      notificationId: notification.id
    })

    const text = `Booking Confirmed: ${data.booking_title || 'Service Booking'}\n\nYour booking has been confirmed and is ready to proceed.\n\nView Booking: ${baseUrl}/dashboard/bookings/${data.booking_id}`

    return { subject, html, text }
  }

  private getDefaultTemplate(
    notification: Notification,
    style: EmailTemplateStyle,
    baseUrl: string
  ): { subject: string; html: string; text: string } {
    const subject = notification.title
    const actionUrl = notification.action_url ? `${baseUrl}${notification.action_url}` : `${baseUrl}/dashboard`
    
    const html = this.getEmailTemplate(style, {
      title: notification.title,
      message: notification.message,
      actionUrl,
      actionLabel: notification.action_label || 'View Details',
      priority: notification.priority,
      notificationId: notification.id
    })

    const text = `${notification.title}\n\n${notification.message}\n\n${notification.action_label || 'View Details'}: ${actionUrl}`

    return { subject, html, text }
  }

  private getEmailTemplate(
    style: EmailTemplateStyle,
    content: {
      title: string
      message: string
      actionUrl: string
      actionLabel: string
      priority: string
      notificationId: string
    }
  ): string {
    const priorityColor = this.getPriorityColor(content.priority)
    
    if (style === 'minimal') {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="border-left: 4px solid ${priorityColor}; padding-left: 20px;">
            <h2 style="color: ${priorityColor}; margin-top: 0;">${content.title}</h2>
            <p>${content.message}</p>
            <a href="${content.actionUrl}" style="display: inline-block; background-color: ${priorityColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px;">${content.actionLabel}</a>
          </div>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">Notification ID: ${content.notificationId}</p>
        </body>
        </html>
      `
    }

    // Modern style (default)
    return `
=======
  /**
   * Log email sent for tracking
   */
  private async logEmailSent(notificationId: string, email: string, notificationType: NotificationType): Promise<void> {
    try {
      await this.supabase
        .from('email_notification_logs')
        .insert({
          notification_id: notificationId,
          email,
          notification_type: notificationType,
          sent_at: new Date().toISOString(),
          status: 'sent'
        })
    } catch (error) {
      console.error('Error logging email sent:', error)
    }
  }

  // Email template generators
  private getBookingCreatedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `New Booking: ${notification.title}`
    const data = notification.data || {}
    
    const html = `
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
<<<<<<< HEAD
        <title>${content.title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, ${priorityColor}, ${priorityColor}dd); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${content.title}</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; margin-bottom: 25px; color: #555;">${content.message}</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${content.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, ${priorityColor}, ${priorityColor}dd); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">${content.actionLabel}</a>
            </div>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666; margin: 0; text-align: center;">Notification ID: ${content.notificationId}</p>
=======
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🎉 New Booking Created!</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="details">
              <p><strong>Service:</strong> ${data.service_title || 'N/A'}</p>
              <p><strong>Date:</strong> ${data.scheduled_date || 'N/A'}</p>
              <p><strong>Amount:</strong> ${data.amount || 'N/A'} ${data.currency || ''}</p>
              <p><strong>Status:</strong> ${data.status || 'Pending'}</p>
            </div>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-primary">
                ${notification.action_label || 'View Booking'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
          </div>
        </div>
      </body>
      </html>
    `
<<<<<<< HEAD
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return '#dc3545'
      case 'high': return '#fd7e14'
      case 'medium': return '#0d6efd'
      case 'low': return '#6c757d'
      default: return '#0d6efd'
    }
  }

  private async logEmailNotification(
    notification: Notification,
    email: string,
    status: 'sent' | 'failed',
    messageId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.supabase
        .from('email_notification_logs')
        .insert({
          notification_id: notification.id,
          email,
          notification_type: notification.type,
          status,
          sent_at: new Date().toISOString(),
          error_message: errorMessage,
          provider: 'supabase',
          provider_message_id: messageId
        })
    } catch (error) {
      console.error('Error logging email notification:', error)
    }
  }

  // Template methods for other notification types
  private getBookingUpdatedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Booking Updated: ${data.booking_title || 'Service Booking'}`
    const html = this.getEmailTemplate(style, {
      title: 'Booking Updated',
      message: `Your booking "${data.booking_title || 'Service Booking'}" has been updated.`,
      actionUrl: `${baseUrl}/dashboard/bookings/${data.booking_id}`,
      actionLabel: 'View Booking',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Booking Updated: ${data.booking_title || 'Service Booking'}\n\nYour booking has been updated.\n\nView Booking: ${baseUrl}/dashboard/bookings/${data.booking_id}`
    return { subject, html, text }
  }

  private getBookingCancelledTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Booking Cancelled: ${data.booking_title || 'Service Booking'}`
    const html = this.getEmailTemplate(style, {
      title: 'Booking Cancelled',
      message: `Your booking "${data.booking_title || 'Service Booking'}" has been cancelled.`,
      actionUrl: `${baseUrl}/dashboard/bookings/${data.booking_id}`,
      actionLabel: 'View Booking',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Booking Cancelled: ${data.booking_title || 'Service Booking'}\n\nYour booking has been cancelled.\n\nView Booking: ${baseUrl}/dashboard/bookings/${data.booking_id}`
    return { subject, html, text }
  }

  private getBookingReminderTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Booking Reminder: ${data.booking_title || 'Service Booking'}`
    const html = this.getEmailTemplate(style, {
      title: 'Booking Reminder',
      message: `Reminder: Your booking "${data.booking_title || 'Service Booking'}" is scheduled for ${data.scheduled_date || 'soon'}.`,
      actionUrl: `${baseUrl}/dashboard/bookings/${data.booking_id}`,
      actionLabel: 'View Booking',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Booking Reminder: ${data.booking_title || 'Service Booking'}\n\nReminder: Your booking is scheduled for ${data.scheduled_date || 'soon'}.\n\nView Booking: ${baseUrl}/dashboard/bookings/${data.booking_id}`
    return { subject, html, text }
  }

  private getBookingCompletedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Booking Completed: ${data.booking_title || 'Service Booking'}`
    const html = this.getEmailTemplate(style, {
      title: 'Booking Completed',
      message: `Your booking "${data.booking_title || 'Service Booking'}" has been completed successfully.`,
      actionUrl: `${baseUrl}/dashboard/bookings/${data.booking_id}`,
      actionLabel: 'View Booking',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Booking Completed: ${data.booking_title || 'Service Booking'}\n\nYour booking has been completed successfully.\n\nView Booking: ${baseUrl}/dashboard/bookings/${data.booking_id}`
    return { subject, html, text }
  }

  // Task templates
  private getTaskCreatedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `New Task: ${data.task_title || 'Task'}`
    const html = this.getEmailTemplate(style, {
      title: 'New Task Created',
      message: `A new task "${data.task_title || 'Task'}" has been created for you.`,
      actionUrl: `${baseUrl}/dashboard/tasks/${data.task_id}`,
      actionLabel: 'View Task',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `New Task: ${data.task_title || 'Task'}\n\nA new task has been created for you.\n\nView Task: ${baseUrl}/dashboard/tasks/${data.task_id}`
    return { subject, html, text }
  }

  private getTaskUpdatedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Task Updated: ${data.task_title || 'Task'}`
    const html = this.getEmailTemplate(style, {
      title: 'Task Updated',
      message: `Task "${data.task_title || 'Task'}" has been updated.`,
      actionUrl: `${baseUrl}/dashboard/tasks/${data.task_id}`,
      actionLabel: 'View Task',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Task Updated: ${data.task_title || 'Task'}\n\nTask has been updated.\n\nView Task: ${baseUrl}/dashboard/tasks/${data.task_id}`
    return { subject, html, text }
  }

  private getTaskCompletedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Task Completed: ${data.task_title || 'Task'}`
    const html = this.getEmailTemplate(style, {
      title: 'Task Completed',
      message: `Task "${data.task_title || 'Task'}" has been completed.`,
      actionUrl: `${baseUrl}/dashboard/tasks/${data.task_id}`,
      actionLabel: 'View Task',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Task Completed: ${data.task_title || 'Task'}\n\nTask has been completed.\n\nView Task: ${baseUrl}/dashboard/tasks/${data.task_id}`
    return { subject, html, text }
  }

  private getTaskOverdueTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Task Overdue: ${data.task_title || 'Task'}`
    const html = this.getEmailTemplate(style, {
      title: 'Task Overdue',
      message: `Task "${data.task_title || 'Task'}" is overdue and needs attention.`,
      actionUrl: `${baseUrl}/dashboard/tasks/${data.task_id}`,
      actionLabel: 'View Task',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Task Overdue: ${data.task_title || 'Task'}\n\nTask is overdue and needs attention.\n\nView Task: ${baseUrl}/dashboard/tasks/${data.task_id}`
    return { subject, html, text }
  }

  // Milestone templates
  private getMilestoneCreatedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `New Milestone: ${data.milestone_title || 'Milestone'}`
    const html = this.getEmailTemplate(style, {
      title: 'New Milestone Created',
      message: `A new milestone "${data.milestone_title || 'Milestone'}" has been created.`,
      actionUrl: `${baseUrl}/dashboard/milestones/${data.milestone_id}`,
      actionLabel: 'View Milestone',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `New Milestone: ${data.milestone_title || 'Milestone'}\n\nA new milestone has been created.\n\nView Milestone: ${baseUrl}/dashboard/milestones/${data.milestone_id}`
    return { subject, html, text }
  }

  private getMilestoneUpdatedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Milestone Updated: ${data.milestone_title || 'Milestone'}`
    const html = this.getEmailTemplate(style, {
      title: 'Milestone Updated',
      message: `Milestone "${data.milestone_title || 'Milestone'}" has been updated.`,
      actionUrl: `${baseUrl}/dashboard/milestones/${data.milestone_id}`,
      actionLabel: 'View Milestone',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Milestone Updated: ${data.milestone_title || 'Milestone'}\n\nMilestone has been updated.\n\nView Milestone: ${baseUrl}/dashboard/milestones/${data.milestone_id}`
    return { subject, html, text }
  }

  private getMilestoneCompletedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Milestone Completed: ${data.milestone_title || 'Milestone'}`
    const html = this.getEmailTemplate(style, {
      title: 'Milestone Completed',
      message: `Milestone "${data.milestone_title || 'Milestone'}" has been completed.`,
      actionUrl: `${baseUrl}/dashboard/milestones/${data.milestone_id}`,
      actionLabel: 'View Milestone',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Milestone Completed: ${data.milestone_title || 'Milestone'}\n\nMilestone has been completed.\n\nView Milestone: ${baseUrl}/dashboard/milestones/${data.milestone_id}`
    return { subject, html, text }
  }

  private getMilestoneOverdueTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Milestone Overdue: ${data.milestone_title || 'Milestone'}`
    const html = this.getEmailTemplate(style, {
      title: 'Milestone Overdue',
      message: `Milestone "${data.milestone_title || 'Milestone'}" is overdue and needs attention.`,
      actionUrl: `${baseUrl}/dashboard/milestones/${data.milestone_id}`,
      actionLabel: 'View Milestone',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Milestone Overdue: ${data.milestone_title || 'Milestone'}\n\nMilestone is overdue and needs attention.\n\nView Milestone: ${baseUrl}/dashboard/milestones/${data.milestone_id}`
    return { subject, html, text }
  }

  // Payment templates
  private getPaymentReceivedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Payment Received: $${data.amount || '0'}`
    const html = this.getEmailTemplate(style, {
      title: 'Payment Received',
      message: `Payment of $${data.amount || '0'} has been received successfully.`,
      actionUrl: `${baseUrl}/dashboard/payments/${data.payment_id}`,
      actionLabel: 'View Payment',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Payment Received: $${data.amount || '0'}\n\nPayment has been received successfully.\n\nView Payment: ${baseUrl}/dashboard/payments/${data.payment_id}`
    return { subject, html, text }
  }

  private getPaymentFailedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Payment Failed: $${data.amount || '0'}`
    const html = this.getEmailTemplate(style, {
      title: 'Payment Failed',
      message: `Payment of $${data.amount || '0'} has failed. Please check your payment method.`,
      actionUrl: `${baseUrl}/dashboard/payments/${data.payment_id}`,
      actionLabel: 'View Payment',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Payment Failed: $${data.amount || '0'}\n\nPayment has failed. Please check your payment method.\n\nView Payment: ${baseUrl}/dashboard/payments/${data.payment_id}`
    return { subject, html, text }
  }

  // Invoice templates
  private getInvoiceCreatedTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `New Invoice: ${data.invoice_number || 'Invoice'}`
    const html = this.getEmailTemplate(style, {
      title: 'New Invoice Created',
      message: `A new invoice "${data.invoice_number || 'Invoice'}" has been created for you.`,
      actionUrl: `${baseUrl}/dashboard/invoices/${data.invoice_id}`,
      actionLabel: 'View Invoice',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `New Invoice: ${data.invoice_number || 'Invoice'}\n\nA new invoice has been created for you.\n\nView Invoice: ${baseUrl}/dashboard/invoices/${data.invoice_id}`
    return { subject, html, text }
  }

  private getInvoiceOverdueTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Invoice Overdue: ${data.invoice_number || 'Invoice'}`
    const html = this.getEmailTemplate(style, {
      title: 'Invoice Overdue',
      message: `Invoice "${data.invoice_number || 'Invoice'}" is overdue and payment is required.`,
      actionUrl: `${baseUrl}/dashboard/invoices/${data.invoice_id}`,
      actionLabel: 'View Invoice',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Invoice Overdue: ${data.invoice_number || 'Invoice'}\n\nInvoice is overdue and payment is required.\n\nView Invoice: ${baseUrl}/dashboard/invoices/${data.invoice_id}`
    return { subject, html, text }
  }

  private getInvoicePaidTemplate(notification: Notification, style: EmailTemplateStyle, baseUrl: string) {
    const data = notification.data as any
    const subject = `Invoice Paid: ${data.invoice_number || 'Invoice'}`
    const html = this.getEmailTemplate(style, {
      title: 'Invoice Paid',
      message: `Invoice "${data.invoice_number || 'Invoice'}" has been paid successfully.`,
      actionUrl: `${baseUrl}/dashboard/invoices/${data.invoice_id}`,
      actionLabel: 'View Invoice',
      priority: notification.priority,
      notificationId: notification.id
    })
    const text = `Invoice Paid: ${data.invoice_number || 'Invoice'}\n\nInvoice has been paid successfully.\n\nView Invoice: ${baseUrl}/dashboard/invoices/${data.invoice_id}`
    return { subject, html, text }
  }
}

export const emailNotificationService = EmailNotificationService.getInstance()
=======

    const text = `
New Booking: ${notification.title}

${notification.message}

Details:
- Service: ${data.service_title || 'N/A'}
- Date: ${data.scheduled_date || 'N/A'}
- Amount: ${data.amount || 'N/A'} ${data.currency || ''}
- Status: ${data.status || 'Pending'}

View Booking: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getBookingUpdatedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Booking Updated: ${notification.title}`
    const data = notification.data || {}
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📝 Booking Updated</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-primary">
                ${notification.action_label || 'View Booking'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Booking Updated: ${notification.title}

${notification.message}

View Booking: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getBookingCancelledTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Booking Cancelled: ${notification.title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>❌ Booking Cancelled</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-secondary">
                ${notification.action_label || 'View Details'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Booking Cancelled: ${notification.title}

${notification.message}

View Details: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getBookingConfirmedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Booking Confirmed: ${notification.title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>✅ Booking Confirmed!</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-success">
                ${notification.action_label || 'View Booking'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Booking Confirmed: ${notification.title}

${notification.message}

View Booking: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getBookingReminderTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Booking Reminder: ${notification.title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>⏰ Booking Reminder</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-warning">
                ${notification.action_label || 'View Booking'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Booking Reminder: ${notification.title}

${notification.message}

View Booking: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getTaskCreatedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `New Task: ${notification.title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📋 New Task Created</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-primary">
                ${notification.action_label || 'View Task'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
New Task: ${notification.title}

${notification.message}

View Task: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getTaskCompletedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Task Completed: ${notification.title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>✅ Task Completed!</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-success">
                ${notification.action_label || 'View Task'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Task Completed: ${notification.title}

${notification.message}

View Task: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getMilestoneCompletedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Milestone Completed: ${notification.title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🎯 Milestone Completed!</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-success">
                ${notification.action_label || 'View Milestone'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Milestone Completed: ${notification.title}

${notification.message}

View Milestone: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getPaymentReceivedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Payment Received: ${notification.title}`
    const data = notification.data || {}
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>💰 Payment Received!</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="details">
              <p><strong>Amount:</strong> ${data.amount || 'N/A'} ${data.currency || ''}</p>
              <p><strong>Payment Method:</strong> ${data.payment_method || 'N/A'}</p>
              <p><strong>Transaction ID:</strong> ${data.transaction_id || 'N/A'}</p>
            </div>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-success">
                ${notification.action_label || 'View Payment'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Payment Received: ${notification.title}

${notification.message}

Amount: ${data.amount || 'N/A'} ${data.currency || ''}
Payment Method: ${data.payment_method || 'N/A'}
Transaction ID: ${data.transaction_id || 'N/A'}

View Payment: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getPaymentFailedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Payment Failed: ${notification.title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>❌ Payment Failed</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-danger">
                ${notification.action_label || 'Retry Payment'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Payment Failed: ${notification.title}

${notification.message}

Retry Payment: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getInvoiceCreatedTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `New Invoice: ${notification.title}`
    const data = notification.data || {}
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📄 New Invoice Created</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="details">
              <p><strong>Invoice Number:</strong> ${data.invoice_number || 'N/A'}</p>
              <p><strong>Amount:</strong> ${data.amount || 'N/A'} ${data.currency || ''}</p>
              <p><strong>Due Date:</strong> ${data.due_date || 'N/A'}</p>
            </div>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-primary">
                ${notification.action_label || 'View Invoice'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
New Invoice: ${notification.title}

${notification.message}

Invoice Number: ${data.invoice_number || 'N/A'}
Amount: ${data.amount || 'N/A'} ${data.currency || ''}
Due Date: ${data.due_date || 'N/A'}

View Invoice: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getInvoiceOverdueTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = `Overdue Invoice: ${notification.title}`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>⚠️ Overdue Invoice</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <div class="action">
              <a href="${notification.action_url || '#'}" class="btn btn-warning">
                ${notification.action_label || 'Pay Now'}
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
Overdue Invoice: ${notification.title}

${notification.message}

Pay Now: ${notification.action_url || '#'}
    `

    return { subject, html, text }
  }

  private getDefaultTemplate(notification: Notification, style: string): EmailTemplate {
    const subject = notification.title
    const priority = notification.priority || 'medium'
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          ${this.getEmailStyles(style)}
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🔔 ${notification.title}</h1>
          </div>
          <div class="content">
            <p>${notification.message}</p>
            ${notification.action_url ? `
              <div class="action">
                <a href="${notification.action_url}" class="btn btn-primary">
                  ${notification.action_label || 'View Details'}
                </a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from Your Business Services Hub.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const text = `
${notification.title}

${notification.message}

${notification.action_url ? `View Details: ${notification.action_url}` : ''}
    `

    return { subject, html, text }
  }

  /**
   * Get email styles based on template style
   */
  private getEmailStyles(style: string): string {
    const baseStyles = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px 20px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 600;
      }
      .content {
        padding: 30px 20px;
      }
      .content h2 {
        color: #333;
        margin: 0 0 15px 0;
        font-size: 20px;
      }
      .content p {
        margin: 0 0 15px 0;
        color: #666;
      }
      .details {
        background-color: #f8f9fa;
        padding: 20px;
        border-radius: 6px;
        margin: 20px 0;
      }
      .details p {
        margin: 5px 0;
        color: #555;
      }
      .action {
        text-align: center;
        margin: 30px 0;
      }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        text-align: center;
        transition: all 0.3s ease;
      }
      .btn-primary {
        background-color: #007bff;
        color: white;
      }
      .btn-primary:hover {
        background-color: #0056b3;
      }
      .btn-success {
        background-color: #28a745;
        color: white;
      }
      .btn-success:hover {
        background-color: #1e7e34;
      }
      .btn-warning {
        background-color: #ffc107;
        color: #212529;
      }
      .btn-warning:hover {
        background-color: #e0a800;
      }
      .btn-danger {
        background-color: #dc3545;
        color: white;
      }
      .btn-danger:hover {
        background-color: #c82333;
      }
      .btn-secondary {
        background-color: #6c757d;
        color: white;
      }
      .btn-secondary:hover {
        background-color: #545b62;
      }
      .footer {
        background-color: #f8f9fa;
        padding: 20px;
        text-align: center;
        color: #666;
        font-size: 14px;
      }
      @media (max-width: 600px) {
        .email-container {
          margin: 0;
          border-radius: 0;
        }
        .header, .content, .footer {
          padding: 20px 15px;
        }
      }
    `

    if (style === 'minimal') {
      return baseStyles.replace(/background: linear-gradient\(135deg, #667eea 0%, #764ba2 100%\)/, 'background-color: #007bff')
    }

    if (style === 'corporate') {
      return baseStyles.replace(/background: linear-gradient\(135deg, #667eea 0%, #764ba2 100%\)/, 'background-color: #2c3e50')
    }

    return baseStyles
  }
}

export const emailNotificationService = EmailNotificationService.getInstance()
>>>>>>> 3dbaad6ce98b2fe339f45ce860b2ae6710cfa712
