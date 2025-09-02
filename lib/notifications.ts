'use client'

import toast from 'react-hot-toast'

export interface NotificationData {
  id: string
  type: 'progress' | 'status' | 'message' | 'payment' | 'deadline' | 'system'
  title: string
  message: string
  bookingId?: string
  userId?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  read: boolean
  createdAt: string
  metadata?: Record<string, any>
}

export interface ProgressUpdate {
  bookingId: string
  progressPercentage: number
  milestone: string
  notes?: string
  updatedBy: string
  previousProgress?: number
}

export interface StatusUpdate {
  bookingId: string
  oldStatus: string
  newStatus: string
  updatedBy: string
  reason?: string
}

class NotificationService {
  private notifications: NotificationData[] = []
  private listeners: ((notifications: NotificationData[]) => void)[] = []

  // Subscribe to notification updates
  subscribe(listener: (notifications: NotificationData[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(listener => listener([...this.notifications]))
  }

  // Add a new notification
  addNotification(notification: Omit<NotificationData, 'id' | 'createdAt' | 'read'>) {
    const newNotification: NotificationData = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      read: false
    }

    this.notifications.unshift(newNotification)
    
    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100)
    }

    this.notify()
    this.showToast(newNotification)
    this.showBrowserNotification(newNotification)
  }

  // Show toast notification
  private showToast(notification: NotificationData) {
    const icon = this.getNotificationIcon(notification.type)
    const duration = notification.priority === 'urgent' ? 8000 : 
                    notification.priority === 'high' ? 6000 : 4000

    toast(notification.message, {
      duration,
      icon,
      style: {
        background: this.getNotificationColor(notification.priority),
        color: '#fff',
        fontWeight: '500'
      }
    })
  }

  // Show browser notification
  private showBrowserNotification(notification: NotificationData) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent'
      })
    }
  }

  // Get notification icon
  private getNotificationIcon(type: string): string {
    const icons = {
      progress: '📊',
      status: '🔄',
      message: '💬',
      payment: '💳',
      deadline: '⏰',
      system: '🔔'
    }
    return icons[type as keyof typeof icons] || '🔔'
  }

  // Get notification color
  private getNotificationColor(priority: string): string {
    const colors = {
      low: '#10b981',
      normal: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    }
    return colors[priority as keyof typeof colors] || '#3b82f6'
  }

  // Mark notification as read
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      this.notify()
    }
  }

  // Mark all as read
  markAllAsRead() {
    this.notifications.forEach(n => n.read = true)
    this.notify()
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }

  // Get notifications
  getNotifications(): NotificationData[] {
    return [...this.notifications]
  }

  // Clear all notifications
  clearAll() {
    this.notifications = []
    this.notify()
  }

  // Progress update notification
  notifyProgressUpdate(update: ProgressUpdate) {
    const progressChange = update.previousProgress 
      ? `${update.previousProgress}% → ${update.progressPercentage}%`
      : `${update.progressPercentage}%`

    this.addNotification({
      type: 'progress',
      title: 'Progress Update',
      message: `Project progress updated to ${progressChange}. ${update.milestone}`,
      bookingId: update.bookingId,
      priority: update.progressPercentage >= 100 ? 'high' : 'normal',
      metadata: {
        progressPercentage: update.progressPercentage,
        milestone: update.milestone,
        notes: update.notes,
        updatedBy: update.updatedBy
      }
    })
  }

  // Status update notification
  notifyStatusUpdate(update: StatusUpdate) {
    this.addNotification({
      type: 'status',
      title: 'Status Change',
      message: `Booking status changed from "${update.oldStatus}" to "${update.newStatus}"`,
      bookingId: update.bookingId,
      priority: this.getStatusPriority(update.newStatus),
      metadata: {
        oldStatus: update.oldStatus,
        newStatus: update.newStatus,
        reason: update.reason,
        updatedBy: update.updatedBy
      }
    })
  }

  // Get status priority
  private getStatusPriority(status: string): 'low' | 'normal' | 'high' | 'urgent' {
    const urgentStatuses = ['cancelled', 'failed', 'overdue']
    const highStatuses = ['completed', 'delivered', 'approved']
    const normalStatuses = ['in_progress', 'review', 'pending']
    
    if (urgentStatuses.includes(status.toLowerCase())) return 'urgent'
    if (highStatuses.includes(status.toLowerCase())) return 'high'
    if (normalStatuses.includes(status.toLowerCase())) return 'normal'
    return 'low'
  }

  // Payment notification
  notifyPayment(paymentData: {
    bookingId: string
    amount: number
    status: 'pending' | 'completed' | 'failed'
    type: 'payment' | 'refund'
  }) {
    const action = paymentData.type === 'refund' ? 'refunded' : 'received'
    this.addNotification({
      type: 'payment',
      title: 'Payment Update',
      message: `Payment ${action}: $${paymentData.amount} (${paymentData.status})`,
      bookingId: paymentData.bookingId,
      priority: paymentData.status === 'failed' ? 'urgent' : 'normal',
      metadata: paymentData
    })
  }

  // Deadline notification
  notifyDeadline(deadlineData: {
    bookingId: string
    deadline: string
    type: 'approaching' | 'overdue' | 'extended'
    daysRemaining?: number
  }) {
    let message = ''
    let priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'

    switch (deadlineData.type) {
      case 'approaching':
        message = `Deadline approaching: ${deadlineData.daysRemaining} days remaining`
        priority = deadlineData.daysRemaining! <= 1 ? 'urgent' : 
                  deadlineData.daysRemaining! <= 3 ? 'high' : 'normal'
        break
      case 'overdue':
        message = 'Project deadline has passed'
        priority = 'urgent'
        break
      case 'extended':
        message = 'Project deadline has been extended'
        priority = 'normal'
        break
    }

    this.addNotification({
      type: 'deadline',
      title: 'Deadline Alert',
      message,
      bookingId: deadlineData.bookingId,
      priority,
      metadata: deadlineData
    })
  }

  // System notification
  notifySystem(systemData: {
    title: string
    message: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    metadata?: Record<string, any>
  }) {
    this.addNotification({
      type: 'system',
      title: systemData.title,
      message: systemData.message,
      priority: systemData.priority || 'normal',
      metadata: systemData.metadata
    })
  }
}

// Create singleton instance
export const notificationService = new NotificationService()

// Export types
export type { ProgressUpdate, StatusUpdate }
