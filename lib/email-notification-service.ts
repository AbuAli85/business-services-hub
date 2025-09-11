import { Notification, NotificationType, NotificationData } from '@/types/notifications'
import { getSupabaseClient } from './supabase'

export type EmailTemplateStyle = 'modern' | 'minimal' | 'corporate'
export type EmailSendPreference = 'immediate' | 'daily_digest' | 'weekly_digest' | 'never'

class EmailNotificationService {
  private static instance: EmailNotificationService

  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService()
    }
    return EmailNotificationService.instance
  }

  async sendEmailNotification(
    notification: Notification,
    recipientEmail: string,
    recipientName: string = 'User',
    templateStyle: EmailTemplateStyle = 'modern'
  ): Promise<boolean> {
    try {
      // Check if user has email notifications enabled
      const supabase = await getSupabaseClient()
      const { data: preferences } = await supabase
        .from('user_email_preferences')
        .select('*')
        .eq('user_id', notification.user_id)
        .maybeSingle()

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
      
      // Send email via API route (absolute URL for server-side)
      const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
      const endpoint = base ? `${base}/api/notifications/email` : '/api/notifications/email'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: process.env.SEND_FROM || process.env.RESEND_FROM || process.env.NEXT_PUBLIC_EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
          replyTo: process.env.NEXT_PUBLIC_EMAIL_REPLY_TO_ADDRESS || process.env.SEND_FROM || 'noreply@resend.dev',
          notificationId: notification.id,
          notificationType: notification.type,
          userId: notification.user_id,
        }),
      })

      const data = await response.json()
      const error = !response.ok ? data : null

      if (error) {
        console.error('Error sending email:', error)
        return false
      }

      // Log the email attempt
      await this.logEmailNotification(notification, recipientEmail, 'sent', data?.messageId)

      return true
    } catch (error) {
      console.error('Error in sendEmailNotification:', error)
      await this.logEmailNotification(notification, recipientEmail, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error')
      return false
    }
  }

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
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
          </div>
        </div>
      </body>
      </html>
    `
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
      const supabase = await getSupabaseClient()
      await supabase
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