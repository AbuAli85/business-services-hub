/**
 * Notification service for bulk actions and system notifications
 */

import type { Booking } from '@/hooks/useBookings'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  bookingIds?: string[]
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export interface BulkNotificationOptions {
  bookingIds: string[]
  action: 'approved' | 'declined' | 'updated' | 'reminder' | 'alert'
  recipientType: 'client' | 'provider' | 'admin' | 'all'
  customMessage?: string
  priority?: NotificationPriority
}

class NotificationService {
  private notifications: Notification[] = []
  private listeners: Array<(notification: Notification) => void> = []

  /**
   * Send bulk notification
   */
  async sendBulkNotification(options: BulkNotificationOptions): Promise<{
    success: boolean
    notificationIds: string[]
    error?: string
  }> {
    try {
      const { bookingIds, action, recipientType, customMessage, priority = 'normal' } = options

      const notification: Notification = {
        id: this.generateId(),
        type: this.getNotificationTypeForAction(action),
        priority,
        title: this.getTitleForAction(action, bookingIds.length),
        message: customMessage || this.getMessageForAction(action, bookingIds.length),
        bookingIds,
        timestamp: new Date(),
        read: false,
        actionUrl: `/dashboard/bookings`
      }

      // Store notification
      this.notifications.push(notification)

      // Notify listeners
      this.notifyListeners(notification)

      // In production, this would call the backend API
      console.log(`Bulk notification sent:`, {
        action,
        recipientType,
        bookingCount: bookingIds.length,
        notification
      })

      return {
        success: true,
        notificationIds: [notification.id]
      }
    } catch (error) {
      console.error('Bulk notification error:', error)
      return {
        success: false,
        notificationIds: [],
        error: error instanceof Error ? error.message : 'Failed to send notification'
      }
    }
  }

  /**
   * Send single booking notification
   */
  async sendBookingNotification(
    bookingId: string,
    action: 'created' | 'updated' | 'approved' | 'declined' | 'completed' | 'cancelled',
    recipientId: string,
    customMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const notification: Notification = {
        id: this.generateId(),
        type: this.getNotificationTypeForAction(action),
        priority: action === 'declined' || action === 'cancelled' ? 'high' : 'normal',
        title: this.getTitleForAction(action, 1),
        message: customMessage || this.getMessageForAction(action, 1),
        bookingIds: [bookingId],
        timestamp: new Date(),
        read: false,
        actionUrl: `/dashboard/bookings/${bookingId}`
      }

      this.notifications.push(notification)
      this.notifyListeners(notification)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send notification'
      }
    }
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter(n => !n.read)
  }

  /**
   * Get all notifications
   */
  getAllNotifications(): Notification[] {
    return [...this.notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true)
  }

  /**
   * Delete a specific notification
   */
  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId)
  }

  /**
   * Bulk actions on notifications
   */
  bulkAction(options: { action: 'mark_read' | 'mark_unread' | 'delete'; notification_ids: string[] }): void {
    const { action, notification_ids } = options
    
    notification_ids.forEach(id => {
      const notification = this.notifications.find(n => n.id === id)
      if (notification) {
        switch (action) {
          case 'mark_read':
            notification.read = true
            break
          case 'mark_unread':
            notification.read = false
            break
          case 'delete':
            this.deleteNotification(id)
            break
        }
      }
    })
  }

  /**
   * Get notification settings for a user
   */
  getNotificationSettings(userId: string): any {
    // In a real app, this would fetch from database
    // For now, return default settings
    return {
      user_id: userId,
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      desktop_notifications: true,
      notification_types: {
        booking_updates: true,
        payment_reminders: true,
        system_alerts: true,
        marketing: false
      },
      frequency: 'immediate',
      quiet_hours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    }
  }

  /**
   * Update notification settings for a user
   */
  updateNotificationSettings(userId: string, settings: any): any {
    // In a real app, this would save to database
    console.log('Notification settings updated for user:', userId, settings)
    return this.getNotificationSettings(userId)
  }

  /**
   * Get notification stats
   */
  getNotificationStats(userId: string): any {
    const allNotifications = this.getAllNotifications()
    const unread = allNotifications.filter(n => !n.read).length
    const recentCount = allNotifications.filter(n => {
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000
      return new Date(n.timestamp).getTime() > twentyFourHoursAgo
    }).length
    
    const by_type: any = { info: 0, success: 0, warning: 0, error: 0 }
    allNotifications.forEach(n => {
      if (by_type[n.type] !== undefined) by_type[n.type]++
    })
    
    const by_priority: any = { low: 0, normal: 0, high: 0, urgent: 0 }
    allNotifications.forEach(n => {
      if (by_priority[n.priority] !== undefined) by_priority[n.priority]++
    })
    
    return { 
      total: allNotifications.length, 
      unread, 
      by_type,
      by_priority,
      recent_count: recentCount 
    }
  }

  /**
   * Create a notification
   */
  createNotification(userId: string, type: string, title: string, message: string, data?: any, priority: string = 'normal'): any {
    const notification = {
      id: this.generateId(),
      type: type as any,
      priority: priority as any,
      title,
      message,
      timestamp: new Date(),
      read: false,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data
    }
    
    this.notifications.push(notification)
    this.notifyListeners(notification)
    return notification
  }

  /**
   * Clear notifications
   */
  clearNotifications(): void {
    this.notifications = []
  }

  /**
   * Subscribe to notifications
   */
  subscribe(listener: (notification: Notification) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  /**
   * Private helper methods
   */
  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getNotificationTypeForAction(action: string): NotificationType {
    const typeMap: Record<string, NotificationType> = {
      approved: 'success',
      completed: 'success',
      declined: 'error',
      cancelled: 'error',
      updated: 'info',
      reminder: 'warning',
      alert: 'warning',
      created: 'info'
    }
    return typeMap[action] || 'info'
  }

  private getTitleForAction(action: string, count: number): string {
    const titleMap: Record<string, string> = {
      approved: count === 1 ? 'Booking Approved' : `${count} Bookings Approved`,
      declined: count === 1 ? 'Booking Declined' : `${count} Bookings Declined`,
      updated: count === 1 ? 'Booking Updated' : `${count} Bookings Updated`,
      completed: count === 1 ? 'Booking Completed' : `${count} Bookings Completed`,
      cancelled: count === 1 ? 'Booking Cancelled' : `${count} Bookings Cancelled`,
      reminder: count === 1 ? 'Booking Reminder' : `Reminder: ${count} Bookings`,
      alert: count === 1 ? 'Booking Alert' : `Alert: ${count} Bookings`,
      created: count === 1 ? 'New Booking' : `${count} New Bookings`
    }
    return titleMap[action] || 'Notification'
  }

  private getMessageForAction(action: string, count: number): string {
    const messageMap: Record<string, string> = {
      approved: count === 1 
        ? 'The booking has been approved and is ready to proceed.'
        : `${count} bookings have been approved and are ready to proceed.`,
      declined: count === 1
        ? 'The booking has been declined.'
        : `${count} bookings have been declined.`,
      updated: count === 1
        ? 'The booking has been updated.'
        : `${count} bookings have been updated.`,
      completed: count === 1
        ? 'The booking has been marked as completed.'
        : `${count} bookings have been marked as completed.`,
      cancelled: count === 1
        ? 'The booking has been cancelled.'
        : `${count} bookings have been cancelled.`,
      reminder: count === 1
        ? 'You have a pending booking that requires attention.'
        : `You have ${count} pending bookings that require attention.`,
      alert: count === 1
        ? 'Action required for this booking.'
        : `Action required for ${count} bookings.`,
      created: count === 1
        ? 'A new booking has been created.'
        : `${count} new bookings have been created.`
    }
    return messageMap[action] || 'A notification has been generated.'
  }

  private notifyListeners(notification: Notification): void {
    this.listeners.forEach(listener => {
      try {
        listener(notification)
      } catch (error) {
        console.error('Notification listener error:', error)
      }
    })
  }
}

// Export singleton instance
export const notificationService = new NotificationService()

/**
 * Helper function to send reminder notifications
 */
export async function sendReminders(bookingIds: string[]): Promise<void> {
  await notificationService.sendBulkNotification({
    bookingIds,
    action: 'reminder',
    recipientType: 'all',
    priority: 'normal'
  })
}

/**
 * Helper function to send bulk approval notifications
 */
export async function sendBulkApprovalNotifications(bookingIds: string[]): Promise<void> {
  await notificationService.sendBulkNotification({
    bookingIds,
    action: 'approved',
    recipientType: 'client',
    priority: 'high'
  })
}
