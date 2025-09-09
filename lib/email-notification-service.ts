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
    this.supabase = getSupabaseClient()
  }

  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService()
    }
    return EmailNotificationService.instance
  }

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
        }
      })

      if (error) {
        console.error('Error sending email:', error)
        return false
      }

      return data?.success || false
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

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
          </div>
        </div>
      </body>
      </html>
    `

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
