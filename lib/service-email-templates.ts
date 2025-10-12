/**
 * Service Email Templates
 * Professional HTML email templates for service status changes
 */

export interface ServiceEmailData {
  providerName: string
  providerEmail: string
  serviceTitle: string
  serviceId: string
  adminName?: string
  reason?: string
  appUrl: string
}

/**
 * Base email template wrapper with consistent styling
 */
function getBaseTemplate(content: string, providerName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Business Services Hub</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">Your Professional Services Platform</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">This email was sent from Business Services Hub</p>
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                If you have questions, please contact us at <a href="mailto:support@businesshub.com" style="color: #667eea; text-decoration: none;">support@businesshub.com</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} Business Services Hub. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Service Approved Email Template
 */
export function getServiceApprovedEmail(data: ServiceEmailData): { subject: string; html: string; text: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <span style="font-size: 40px; color: white;">✅</span>
      </div>
      <h2 style="margin: 0; color: #10b981; font-size: 24px; font-weight: 700;">Service Approved!</h2>
    </div>
    
    <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 20px 0;">
      Hi <strong>${data.providerName}</strong>,
    </p>
    
    <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 20px 0;">
      Great news! Your service <strong>"${data.serviceTitle}"</strong> has been approved ${data.adminName ? `by ${data.adminName}` : 'by our admin team'} and is now live on the platform.
    </p>
    
    <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
        <strong>What this means:</strong><br>
        • Your service is now visible to all clients<br>
        • Clients can browse and book your service<br>
        • You'll receive notifications for new bookings<br>
        • Your service appears in search results
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.appUrl}/dashboard/services/${data.serviceId}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
        View My Service
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
      Thank you for being part of Business Services Hub. We're excited to see your service succeed!
    </p>
  `
  
  const textVersion = `
Hi ${data.providerName},

Great news! Your service "${data.serviceTitle}" has been approved ${data.adminName ? `by ${data.adminName}` : 'by our admin team'} and is now live on the platform.

What this means:
• Your service is now visible to all clients
• Clients can browse and book your service
• You'll receive notifications for new bookings
• Your service appears in search results

View your service: ${data.appUrl}/dashboard/services/${data.serviceId}

Thank you for being part of Business Services Hub!

---
Business Services Hub
© ${new Date().getFullYear()} All rights reserved.
  `.trim()
  
  return {
    subject: `🎉 Service Approved: ${data.serviceTitle}`,
    html: getBaseTemplate(content, data.providerName),
    text: textVersion
  }
}

/**
 * Service Rejected Email Template
 */
export function getServiceRejectedEmail(data: ServiceEmailData): { subject: string; html: string; text: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <span style="font-size: 40px; color: white;">❌</span>
      </div>
      <h2 style="margin: 0; color: #ef4444; font-size: 24px; font-weight: 700;">Service Requires Attention</h2>
    </div>
    
    <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 20px 0;">
      Hi <strong>${data.providerName}</strong>,
    </p>
    
    <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 20px 0;">
      Your service <strong>"${data.serviceTitle}"</strong> was reviewed ${data.adminName ? `by ${data.adminName}` : 'by our admin team'} and requires some changes before it can be published.
    </p>
    
    ${data.reason ? `
    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px; font-weight: 600;">Reason for rejection:</p>
      <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6; white-space: pre-line;">
        ${data.reason}
      </p>
    </div>
    ` : ''}
    
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
        <strong>Next steps:</strong><br>
        • Review the feedback above<br>
        • Edit your service to address the concerns<br>
        • Resubmit for approval<br>
        • Our team will review it again promptly
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.appUrl}/dashboard/services/${data.serviceId}/edit" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
        Edit My Service
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
      Need help? Feel free to reach out to our support team.
    </p>
  `
  
  const textVersion = `
Hi ${data.providerName},

Your service "${data.serviceTitle}" was reviewed ${data.adminName ? `by ${data.adminName}` : 'by our admin team'} and requires some changes before it can be published.

${data.reason ? `Reason for rejection:\n${data.reason}\n\n` : ''}
Next steps:
• Review the feedback above
• Edit your service to address the concerns
• Resubmit for approval
• Our team will review it again promptly

Edit your service: ${data.appUrl}/dashboard/services/${data.serviceId}/edit

Need help? Contact support@businesshub.com

---
Business Services Hub
© ${new Date().getFullYear()} All rights reserved.
  `.trim()
  
  return {
    subject: `⚠️ Service Requires Attention: ${data.serviceTitle}`,
    html: getBaseTemplate(content, data.providerName),
    text: textVersion
  }
}

/**
 * Service Suspended Email Template
 */
export function getServiceSuspendedEmail(data: ServiceEmailData): { subject: string; html: string; text: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <span style="font-size: 40px; color: white;">⚠️</span>
      </div>
      <h2 style="margin: 0; color: #f59e0b; font-size: 24px; font-weight: 700;">Service Suspended</h2>
    </div>
    
    <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 20px 0;">
      Hi <strong>${data.providerName}</strong>,
    </p>
    
    <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 20px 0;">
      Your service <strong>"${data.serviceTitle}"</strong> has been temporarily suspended ${data.adminName ? `by ${data.adminName}` : 'by our admin team'}.
    </p>
    
    ${data.reason ? `
    <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">Reason for suspension:</p>
      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6; white-space: pre-line;">
        ${data.reason}
      </p>
    </div>
    ` : ''}
    
    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
        <strong>Important:</strong><br>
        • Your service is no longer visible to clients<br>
        • Existing bookings are not affected<br>
        • Please review and address the issue<br>
        • Contact support for assistance
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.appUrl}/dashboard/services/${data.serviceId}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
        View Service Details
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
      Please contact our support team if you need clarification or assistance.
    </p>
  `
  
  const textVersion = `
Hi ${data.providerName},

Your service "${data.serviceTitle}" has been temporarily suspended ${data.adminName ? `by ${data.adminName}` : 'by our admin team'}.

${data.reason ? `Reason for suspension:\n${data.reason}\n\n` : ''}
Important:
• Your service is no longer visible to clients
• Existing bookings are not affected
• Please review and address the issue
• Contact support for assistance

View service details: ${data.appUrl}/dashboard/services/${data.serviceId}

Contact support: support@businesshub.com

---
Business Services Hub
© ${new Date().getFullYear()} All rights reserved.
  `.trim()
  
  return {
    subject: `⚠️ Service Suspended: ${data.serviceTitle}`,
    html: getBaseTemplate(content, data.providerName),
    text: textVersion
  }
}

/**
 * Service Featured Email Template
 */
export function getServiceFeaturedEmail(data: ServiceEmailData): { subject: string; html: string; text: string } {
  const content = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <span style="font-size: 40px; color: white;">⭐</span>
      </div>
      <h2 style="margin: 0; color: #a855f7; font-size: 24px; font-weight: 700;">Your Service is Featured!</h2>
    </div>
    
    <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 20px 0;">
      Hi <strong>${data.providerName}</strong>,
    </p>
    
    <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin: 20px 0;">
      Congratulations! Your service <strong>"${data.serviceTitle}"</strong> has been selected as a featured service on our platform.
    </p>
    
    <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-left: 4px solid #a855f7; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #6b21a8; font-size: 14px; line-height: 1.6;">
        <strong>Benefits of being featured:</strong><br>
        • Premium placement on homepage<br>
        • Increased visibility to clients<br>
        • Higher search rankings<br>
        • Featured badge on your service card<br>
        • Potential for more bookings
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.appUrl}/services/${data.serviceId}" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
        See My Featured Service
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
      Keep up the great work!
    </p>
  `
  
  const textVersion = `
Hi ${data.providerName},

Congratulations! Your service "${data.serviceTitle}" has been selected as a featured service on our platform.

Benefits of being featured:
• Premium placement on homepage
• Increased visibility to clients
• Higher search rankings
• Featured badge on your service card
• Potential for more bookings

View your featured service: ${data.appUrl}/services/${data.serviceId}

Keep up the great work!

---
Business Services Hub
© ${new Date().getFullYear()} All rights reserved.
  `.trim()
  
  return {
    subject: `⭐ Your Service is Featured: ${data.serviceTitle}`,
    html: getBaseTemplate(content, data.providerName),
    text: textVersion
  }
}

/**
 * Send service action email to provider
 */
export async function sendServiceActionEmail(
  action: 'approved' | 'rejected' | 'suspended' | 'featured',
  data: ServiceEmailData
): Promise<boolean> {
  try {
    const templates = {
      approved: getServiceApprovedEmail,
      rejected: getServiceRejectedEmail,
      suspended: getServiceSuspendedEmail,
      featured: getServiceFeaturedEmail
    }
    
    const template = templates[action]
    if (!template) {
      console.error('Unknown email template:', action)
      return false
    }
    
    const { subject, html, text } = template(data)
    
    // Call the email API - use current domain to avoid domain issues
    const apiUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/send-email`
      : '/api/send-email'
    
    console.log('📧 Sending email to:', data.providerEmail, 'via:', apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: data.providerEmail,
        subject,
        html,
        text,
        notificationType: `service_${action}`,
        userId: data.serviceId
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Email API error:', errorData)
      return false
    }
    
    console.log('✅ Service action email sent:', action, 'to', data.providerEmail)
    return true
  } catch (error) {
    console.error('Failed to send service action email:', error)
    return false
  }
}

