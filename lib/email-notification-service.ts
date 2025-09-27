import { Notification } from '@/types/notifications'

export class EmailNotificationService {
  private static instance: EmailNotificationService

  private constructor() {}

  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService()
    }
    return EmailNotificationService.instance
  }

  async sendEmailNotification(
    notification: Notification,
    userEmail: string,
    userName: string
  ): Promise<boolean> {
    try {
      // Check if user has email notifications enabled
      const userPreferences = await this.getUserEmailPreferences(notification.user_id)
      if (!userPreferences?.email_enabled) {
        console.log(`Email notifications disabled for user ${notification.user_id}`)
        return false
      }

      // Check if this notification type is disabled
      if (userPreferences.disabled_types?.includes(notification.type)) {
        console.log(`Email notifications disabled for type ${notification.type} for user ${notification.user_id}`)
        return false
      }

      // Check delivery frequency
      if (userPreferences.delivery_frequency === 'never') {
        console.log(`Email delivery disabled for user ${notification.user_id}`)
        return false
      }

      // For immediate delivery, send right away
      if (userPreferences.delivery_frequency === 'immediate') {
        return await this.sendImmediateEmail(notification, userEmail, userName, userPreferences)
      }

      // For digest delivery, queue for later processing
      if (userPreferences.delivery_frequency === 'daily_digest' || userPreferences.delivery_frequency === 'weekly_digest') {
        return await this.queueForDigest(notification, userEmail, userName, userPreferences)
      }

      return false
    } catch (error) {
      console.error('Error sending email notification:', error)
      return false
    }
  }

  private async getUserEmailPreferences(userId: string) {
    try {
      const { getSupabaseAdminClient } = await import('./supabase')
      const supabase = await getSupabaseAdminClient()
      
      const { data, error } = await supabase
        .from('user_email_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching email preferences:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching email preferences:', error)
      return null
    }
  }

  private async sendImmediateEmail(
    notification: Notification,
    userEmail: string,
    userName: string,
    preferences: any
  ): Promise<boolean> {
    // Use absolute URL for server-side requests
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const emailApiUrl = `${baseUrl}/api/notifications/email`
    
    try {
      const emailContent = this.generateEmailContent(notification, userName, preferences)
      
      console.log('📧 Attempting to send email via:', emailApiUrl)
      
      const response = await fetch(emailApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: userEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        })
      })

      if (!response.ok) {
        console.error('Failed to send email:', await response.text())
        return false
      }

      console.log(`Email sent successfully to ${userEmail} for notification ${notification.id}`)
      return true
    } catch (error) {
      // Check for DNS resolution errors
      if (error instanceof Error && error.message.includes('ENOTFOUND')) {
        console.warn('⚠️ Email notification skipped due to DNS resolution error:', {
          message: error.message,
          url: emailApiUrl,
          suggestion: 'Check if the domain is accessible from the server environment'
        })
      } else if (error instanceof Error && error.message.includes('fetch failed')) {
        console.warn('⚠️ Email notification skipped due to network error:', {
          message: error.message,
          url: emailApiUrl,
          suggestion: 'Check network connectivity and URL accessibility'
        })
      } else {
        console.error('❌ Error sending immediate email:', error)
      }
      return false
    }
  }

  private async queueForDigest(
    notification: Notification,
    userEmail: string,
    userName: string,
    preferences: any
  ): Promise<boolean> {
    try {
      // For now, just log that we're queuing for digest
      // In a full implementation, you'd store this in a digest queue table
      console.log(`Queuing notification ${notification.id} for ${preferences.delivery_frequency} digest for user ${notification.user_id}`)
      return true
    } catch (error) {
      console.error('Error queuing for digest:', error)
      return false
    }
  }

  private generateEmailContent(notification: Notification, userName: string, preferences: any) {
    const templateStyle = preferences.template_style || 'modern'
    const includeBranding = preferences.include_company_branding !== false

    const priorityColors: Record<import('@/types/notifications').NotificationPriority, string> = {
      urgent: '#ef4444',
      high: '#f59e0b',
      normal: '#3b82f6',
      low: '#10b981'
    }

    const priorityColor = priorityColors[notification.priority] || '#3b82f6'

    let html = ''
    let text = ''

    if (templateStyle === 'minimal') {
      html = this.generateMinimalTemplate(notification, userName, priorityColor, includeBranding)
      text = this.generateTextTemplate(notification, userName)
    } else if (templateStyle === 'corporate') {
      html = this.generateCorporateTemplate(notification, userName, priorityColor, includeBranding)
      text = this.generateTextTemplate(notification, userName)
    } else {
      // modern (default)
      html = this.generateModernTemplate(notification, userName, priorityColor, includeBranding)
      text = this.generateTextTemplate(notification, userName)
    }

    return {
      subject: notification.title,
      html,
      text
    }
  }

  private generateModernTemplate(notification: Notification, userName: string, priorityColor: string, includeBranding: boolean) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, ${priorityColor}, ${priorityColor}dd); color: white; padding: 24px; text-align: center; }
    .content { padding: 32px 24px; }
    .priority-badge { display: inline-block; background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    .message { font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
    .action-button { display: inline-block; background: ${priorityColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 14px; color: #6b7280; }
    .unsubscribe { margin-top: 16px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">${notification.title}</h1>
      <div class="priority-badge">${notification.priority}</div>
    </div>
    <div class="content">
      <p>Hello ${userName},</p>
      <div class="message">${notification.message}</div>
      ${notification.action_url ? `<a href="${notification.action_url}" class="action-button">${notification.action_label || 'View Details'}</a>` : ''}
    </div>
    <div class="footer">
      ${includeBranding ? '<p><strong>Business Services Hub</strong></p>' : ''}
      <p>This notification was sent to ${userName}.</p>
      <div class="unsubscribe">
        <a href="/dashboard/settings?tab=notifications">Manage notification preferences</a>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  private generateMinimalTemplate(notification: Notification, userName: string, priorityColor: string, includeBranding: boolean) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${notification.title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 4px; }
    .priority { color: ${priorityColor}; font-weight: bold; font-size: 12px; text-transform: uppercase; }
    .message { margin: 20px 0; }
    .action { margin-top: 20px; }
    .action a { color: ${priorityColor}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="priority">${notification.priority}</div>
    <h2>${notification.title}</h2>
    <p>Hello ${userName},</p>
    <div class="message">${notification.message}</div>
    ${notification.action_url ? `<div class="action"><a href="${notification.action_url}">${notification.action_label || 'View Details'}</a></div>` : ''}
    ${includeBranding ? '<hr><p><small>Business Services Hub</small></p>' : ''}
  </div>
</body>
</html>`
  }

  private generateCorporateTemplate(notification: Notification, userName: string, priorityColor: string, includeBranding: boolean) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${notification.title}</title>
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; }
    .header { background: #1f2937; color: white; padding: 20px; }
    .content { padding: 30px; }
    .priority { background: ${priorityColor}; color: white; padding: 8px 16px; display: inline-block; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .message { margin: 20px 0; font-size: 16px; }
    .action-button { background: ${priorityColor}; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; margin-top: 20px; font-weight: bold; }
    .footer { background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">${notification.title}</h1>
    </div>
    <div class="content">
      <div class="priority">${notification.priority}</div>
      <p>Dear ${userName},</p>
      <div class="message">${notification.message}</div>
      ${notification.action_url ? `<a href="${notification.action_url}" class="action-button">${notification.action_label || 'View Details'}</a>` : ''}
    </div>
    <div class="footer">
      ${includeBranding ? '<p><strong>Business Services Hub</strong><br>Professional Services Management Platform</p>' : ''}
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`
  }

  private generateTextTemplate(notification: Notification, userName: string) {
    return `
${notification.title}

Hello ${userName},

${notification.message}

${notification.action_url ? `View Details: ${notification.action_url}` : ''}

---
Business Services Hub
This is an automated notification.
`
  }
}

export const emailNotificationService = EmailNotificationService.getInstance()