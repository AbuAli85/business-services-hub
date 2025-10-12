import { getSupabaseClient } from '@/lib/supabase'
import { sendServiceActionEmail } from '@/lib/service-email-templates'

/**
 * Service Notification Helper
 * Creates notifications for providers when admins take actions on their services
 * Also sends email notifications for critical actions
 */

export interface ServiceNotificationData {
  serviceId: string
  serviceTitle: string
  action: 'approved' | 'rejected' | 'suspended' | 'featured' | 'unfeatured' | 'edited'
  adminName?: string
  reason?: string
  providerEmail?: string
  providerName?: string
}

/**
 * Create a notification for the service provider
 */
export async function notifyProvider(
  providerId: string,
  data: ServiceNotificationData
): Promise<void> {
  try {
    const supabase = await getSupabaseClient()
    
    const notificationConfig = getNotificationConfig(data.action)
    const message = buildNotificationMessage(data)
    
    const notification = {
      user_id: providerId,
      type: 'service',
      title: notificationConfig.title.replace('{serviceTitle}', data.serviceTitle),
      message: message,
      data: {
        service_id: data.serviceId,
        action: data.action,
        admin_name: data.adminName,
        reason: data.reason
      },
      priority: notificationConfig.priority,
      action_url: `/dashboard/services/${data.serviceId}`,
      action_label: 'View Service',
      read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('notifications')
      .insert(notification)

    if (error) {
      console.error('Error creating notification:', error)
      console.error('Notification data:', notification)
      
      // Don't throw - notification failure shouldn't block the main action
      console.warn('⚠️ Notification creation failed, but continuing with email...')
      return
    }

    console.log('✅ In-app notification created for provider:', providerId, 'Action:', data.action)
    
    // Send email notification for critical actions only
    const emailActions = ['approved', 'rejected', 'suspended', 'featured'] as const
    type EmailAction = typeof emailActions[number]
    
    if (emailActions.includes(data.action as any) && data.providerEmail && data.providerName) {
      // Send email asynchronously (don't await to avoid blocking)
      sendServiceActionEmail(data.action as EmailAction, {
        providerName: data.providerName,
        providerEmail: data.providerEmail,
        serviceTitle: data.serviceTitle,
        serviceId: data.serviceId,
        adminName: data.adminName,
        reason: data.reason,
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      }).then(success => {
        if (success) {
          console.log('✅ Email notification sent for provider:', data.providerEmail, 'Action:', data.action)
        } else {
          console.warn('⚠️ Email notification failed for provider:', data.providerEmail, 'Action:', data.action)
        }
      }).catch(err => {
        console.error('❌ Email notification error:', err)
      })
    } else {
      console.log('ℹ️ Skipping email for action:', data.action, '(not a critical action or missing provider info)')
    }
  } catch (error) {
    console.error('Failed to notify provider:', error)
    // Don't throw - notification failure shouldn't block the main action
  }
}

/**
 * Create an audit log entry for admin actions on services
 */
export async function createAuditLog(
  serviceId: string,
  action: string,
  adminId: string,
  adminName?: string,
  adminEmail?: string,
  metadata?: any
): Promise<void> {
  try {
    const supabase = await getSupabaseClient()
    
    const auditLog = {
      service_id: serviceId,
      event: action,
      actor_id: adminId,
      actor_name: adminName,
      actor_email: adminEmail,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('service_audit_logs')
      .insert(auditLog)
    
    if (error) {
      console.error('Error creating audit log:', error)
      console.error('Audit log data:', auditLog)
      console.warn('⚠️ Audit log creation failed, but main action will continue...')
      return
    }
    
    console.log('✅ Audit log created for service:', serviceId, 'Action:', action)
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Get notification configuration based on action type
 */
function getNotificationConfig(action: ServiceNotificationData['action']) {
  const configs = {
    approved: {
      title: '🎉 Service Approved: {serviceTitle}',
      priority: 'high',
      emoji: '✅'
    },
    rejected: {
      title: '❌ Service Rejected: {serviceTitle}',
      priority: 'high',
      emoji: '❌'
    },
    suspended: {
      title: '⚠️ Service Suspended: {serviceTitle}',
      priority: 'urgent',
      emoji: '⚠️'
    },
    featured: {
      title: '⭐ Service Featured: {serviceTitle}',
      priority: 'normal',
      emoji: '⭐'
    },
    unfeatured: {
      title: 'Service Unfeatured: {serviceTitle}',
      priority: 'low',
      emoji: '🔄'
    },
    edited: {
      title: 'Service Edited: {serviceTitle}',
      priority: 'normal',
      emoji: '✏️'
    }
  }
  
  return configs[action] || configs.edited
}

/**
 * Build notification message based on action
 */
function buildNotificationMessage(data: ServiceNotificationData): string {
  const adminText = data.adminName ? ` by ${data.adminName}` : ' by an admin'
  const reasonText = data.reason ? `\n\nReason: ${data.reason}` : ''
  
  const messages = {
    approved: `Great news! Your service "${data.serviceTitle}" has been approved${adminText} and is now live on the platform. Clients can now book your service.${reasonText}`,
    rejected: `Your service "${data.serviceTitle}" has been rejected${adminText}. Please review the feedback and make necessary changes before resubmitting.${reasonText}`,
    suspended: `Your service "${data.serviceTitle}" has been temporarily suspended${adminText}. Please contact support for more information.${reasonText}`,
    featured: `Congratulations! Your service "${data.serviceTitle}" is now featured on the platform. This will increase its visibility to potential clients.${reasonText}`,
    unfeatured: `Your service "${data.serviceTitle}" is no longer featured${adminText}.${reasonText}`,
    edited: `Your service "${data.serviceTitle}" has been edited${adminText}. Please review the changes.${reasonText}`
  }
  
  return messages[data.action] || `Your service "${data.serviceTitle}" has been updated${adminText}.${reasonText}`
}

/**
 * Notify provider and create audit log in one call
 */
export async function notifyAndLog(
  providerId: string,
  serviceId: string,
  serviceTitle: string,
  action: ServiceNotificationData['action'],
  adminId: string,
  adminName?: string,
  adminEmail?: string,
  reason?: string,
  metadata?: any,
  providerEmail?: string,
  providerName?: string
): Promise<void> {
  // Create notification for provider (includes email sending)
  await notifyProvider(providerId, {
    serviceId,
    serviceTitle,
    action,
    adminName,
    reason,
    providerEmail,
    providerName
  })
  
  // Create audit log
  await createAuditLog(
    serviceId,
    action.charAt(0).toUpperCase() + action.slice(1), // Capitalize first letter
    adminId,
    adminName,
    adminEmail,
    { reason, ...metadata }
  )
}

