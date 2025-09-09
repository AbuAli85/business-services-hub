import { getSupabaseClient } from './supabase'
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationData, 
  NotificationSettings,
  NotificationTemplate,
  NotificationStats,
  NotificationFilters,
  NotificationBulkAction
} from '@/types/notifications'

export class NotificationService {
  private static instance: NotificationService
  private supabase: any = null

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  private async getSupabase() {
    if (!this.supabase) {
      this.supabase = await getSupabaseClient()
    }
    return this.supabase
  }

  // Create a new notification
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: NotificationData,
    priority: NotificationPriority = 'medium',
    expiresAt?: string
  ): Promise<Notification> {
    const supabase = await this.getSupabase()
    
    const notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      type,
      title,
      message,
      data: data || {},
      read: false,
      priority,
      expires_at: expiresAt,
      action_url: this.generateActionUrl(type, data),
      action_label: this.getActionLabel(type)
    }

    const { data: result, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      throw new Error('Failed to create notification')
    }

    return result
  }

  // Get notifications for a user
  async getNotifications(
    userId: string,
    filters?: NotificationFilters,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    const supabase = await this.getSupabase()
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters) {
      if (filters.type) {
        query = query.eq('type', filters.type)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters.read !== undefined) {
        query = query.eq('read', filters.read)
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,message.ilike.%${filters.search}%`)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      throw new Error('Failed to fetch notifications')
    }

    return data || []
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const supabase = await this.getSupabase()
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) {
      console.error('Error marking notification as read:', error)
      throw new Error('Failed to mark notification as read')
    }
  }

  // Mark multiple notifications as read
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    const supabase = await this.getSupabase()
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .in('id', notificationIds)

    if (error) {
      console.error('Error marking notifications as read:', error)
      throw new Error('Failed to mark notifications as read')
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    const supabase = await this.getSupabase()
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('Error marking all notifications as read:', error)
      throw new Error('Failed to mark all notifications as read')
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    const supabase = await this.getSupabase()
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('Error deleting notification:', error)
      throw new Error('Failed to delete notification')
    }
  }

  // Bulk actions
  async bulkAction(action: NotificationBulkAction): Promise<void> {
    const supabase = await this.getSupabase()
    
    const updateData: any = { updated_at: new Date().toISOString() }
    
    switch (action.action) {
      case 'mark_read':
        updateData.read = true
        break
      case 'mark_unread':
        updateData.read = false
        break
      case 'delete':
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .in('id', action.notification_ids)
        
        if (deleteError) {
          console.error('Error deleting notifications:', deleteError)
          throw new Error('Failed to delete notifications')
        }
        return
    }

    const { error } = await supabase
      .from('notifications')
      .update(updateData)
      .in('id', action.notification_ids)

    if (error) {
      console.error('Error performing bulk action:', error)
      throw new Error('Failed to perform bulk action')
    }
  }

  // Get notification statistics
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const supabase = await this.getSupabase()
    
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('type, priority, read, created_at')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching notification stats:', error)
      throw new Error('Failed to fetch notification stats')
    }

    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter((n: any) => !n.read).length,
      by_type: {} as Record<NotificationType, number>,
      by_priority: {} as Record<NotificationPriority, number>,
      recent_count: notifications.filter((n: any) => {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        return new Date(n.created_at) > dayAgo
      }).length
    }

    // Count by type
    notifications.forEach((notification: any) => {
      stats.by_type[notification.type as NotificationType] = (stats.by_type[notification.type as NotificationType] || 0) + 1
      stats.by_priority[notification.priority as NotificationPriority] = (stats.by_priority[notification.priority as NotificationPriority] || 0) + 1
    })

    return stats
  }

  // Get user notification settings
  async getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching notification settings:', error)
      throw new Error('Failed to fetch notification settings')
    }

    return data
  }

  // Update user notification settings
  async updateNotificationSettings(
    userId: string, 
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    const supabase = await this.getSupabase()
    
    const { data, error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating notification settings:', error)
      throw new Error('Failed to update notification settings')
    }

    return data
  }

  // Create notification from template
  async createFromTemplate(
    userId: string,
    type: NotificationType,
    data: NotificationData,
    template: NotificationTemplate
  ): Promise<Notification> {
    const title = this.interpolateTemplate(template.title_template, data)
    const message = this.interpolateTemplate(template.message_template, data)
    const actionUrl = template.action_url_template 
      ? this.interpolateTemplate(template.action_url_template, data)
      : undefined

    const expiresAt = template.default_expires_in_hours
      ? new Date(Date.now() + template.default_expires_in_hours * 60 * 60 * 1000).toISOString()
      : undefined

    return this.createNotification(
      userId,
      type,
      title,
      message,
      data,
      template.priority,
      expiresAt
    )
  }

  // Helper methods
  private generateActionUrl(type: NotificationType, data?: NotificationData): string | undefined {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    
    switch (type) {
      case 'task_created':
      case 'task_updated':
      case 'task_completed':
      case 'task_overdue':
      case 'task_assigned':
      case 'task_comment':
        return data?.task_id ? `${baseUrl}/dashboard/bookings/${data.booking_id}/milestones` : undefined
      
      case 'milestone_created':
      case 'milestone_updated':
      case 'milestone_completed':
      case 'milestone_overdue':
      case 'milestone_approved':
      case 'milestone_rejected':
        return data?.milestone_id ? `${baseUrl}/dashboard/bookings/${data.booking_id}/milestones` : undefined
      
      case 'booking_created':
      case 'booking_updated':
      case 'booking_cancelled':
      case 'booking_completed':
        return data?.booking_id ? `${baseUrl}/dashboard/bookings/${data.booking_id}` : undefined
      
      case 'payment_received':
      case 'payment_failed':
      case 'invoice_created':
      case 'invoice_overdue':
      case 'invoice_paid':
        return data?.invoice_id ? `${baseUrl}/dashboard/invoices` : undefined
      
      case 'message_received':
        return data?.message_id ? `${baseUrl}/dashboard/messages` : undefined
      
      case 'document_uploaded':
      case 'document_approved':
      case 'document_rejected':
        return data?.document_id ? `${baseUrl}/dashboard/documents` : undefined
      
      default:
        return undefined
    }
  }

  private getActionLabel(type: NotificationType): string | undefined {
    switch (type) {
      case 'task_created':
      case 'task_updated':
      case 'task_completed':
      case 'task_overdue':
      case 'task_assigned':
      case 'task_comment':
        return 'View Task'
      
      case 'milestone_created':
      case 'milestone_updated':
      case 'milestone_completed':
      case 'milestone_overdue':
      case 'milestone_approved':
      case 'milestone_rejected':
        return 'View Milestone'
      
      case 'booking_created':
      case 'booking_updated':
      case 'booking_cancelled':
      case 'booking_completed':
        return 'View Booking'
      
      case 'payment_received':
      case 'payment_failed':
      case 'invoice_created':
      case 'invoice_overdue':
      case 'invoice_paid':
        return 'View Invoice'
      
      case 'message_received':
        return 'View Message'
      
      case 'document_uploaded':
      case 'document_approved':
      case 'document_rejected':
        return 'View Document'
      
      default:
        return 'View Details'
    }
  }

  private interpolateTemplate(template: string, data: NotificationData): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key as keyof NotificationData]?.toString() || match
    })
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<void> {
    const supabase = await this.getSupabase()
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('Error cleaning up expired notifications:', error)
      throw new Error('Failed to cleanup expired notifications')
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()
