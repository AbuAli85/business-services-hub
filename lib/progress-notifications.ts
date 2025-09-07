import { getSupabaseClient } from './supabase'

export interface ProgressNotification {
  id: string
  booking_id: string
  user_id: string
  type: 'milestone_completed' | 'task_completed' | 'project_completed' | 'overdue_task' | 'time_logged' | 'progress_update'
  title: string
  message: string
  data: any
  read: boolean
  created_at: string
}

export interface NotificationPreferences {
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  milestone_completed: boolean
  task_completed: boolean
  project_completed: boolean
  overdue_task: boolean
  time_logged: boolean
  progress_update: boolean
}

export class ProgressNotificationService {
  private static instance: ProgressNotificationService

  static getInstance(): ProgressNotificationService {
    if (!ProgressNotificationService.instance) {
      ProgressNotificationService.instance = new ProgressNotificationService()
    }
    return ProgressNotificationService.instance
  }

  async createNotification(
    bookingId: string,
    userId: string,
    type: ProgressNotification['type'],
    title: string,
    message: string,
    data: any = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('progress_notifications')
        .insert({
          booking_id: bookingId,
          user_id: userId,
          type,
          title,
          message,
          data,
          read: false,
          created_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(error.message)
      }

      // Send real-time notification
      await this.sendRealtimeNotification(bookingId, userId, {
        type,
        title,
        message,
        data
      })

      return { success: true }
    } catch (error) {
      console.error('Error creating progress notification:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async getNotifications(userId: string, limit: number = 50): Promise<ProgressNotification[]> {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('progress_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(error.message)
      }

      return data || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('progress_notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('progress_notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        throw new Error(error.message)
      }

      return { success: true }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const supabase = await getSupabaseClient()
      
      const { count, error } = await supabase
        .from('progress_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        throw new Error(error.message)
      }

      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  async notifyMilestoneCompleted(
    bookingId: string,
    milestoneId: string,
    milestoneTitle: string,
    userId: string
  ): Promise<void> {
    await this.createNotification(
      bookingId,
      userId,
      'milestone_completed',
      'Milestone Completed! 🎉',
      `The milestone "${milestoneTitle}" has been completed.`,
      { milestone_id: milestoneId, milestone_title: milestoneTitle }
    )
  }

  async notifyTaskCompleted(
    bookingId: string,
    taskId: string,
    taskTitle: string,
    userId: string
  ): Promise<void> {
    await this.createNotification(
      bookingId,
      userId,
      'task_completed',
      'Task Completed! ✅',
      `The task "${taskTitle}" has been completed.`,
      { task_id: taskId, task_title: taskTitle }
    )
  }

  async notifyProjectCompleted(
    bookingId: string,
    projectTitle: string,
    userId: string
  ): Promise<void> {
    await this.createNotification(
      bookingId,
      userId,
      'project_completed',
      'Project Completed! 🎊',
      `Congratulations! The project "${projectTitle}" has been completed.`,
      { project_title: projectTitle }
    )
  }

  async notifyOverdueTask(
    bookingId: string,
    taskId: string,
    taskTitle: string,
    userId: string
  ): Promise<void> {
    await this.createNotification(
      bookingId,
      userId,
      'overdue_task',
      'Overdue Task Alert! ⚠️',
      `The task "${taskTitle}" is now overdue.`,
      { task_id: taskId, task_title: taskTitle }
    )
  }

  async notifyTimeLogged(
    bookingId: string,
    taskId: string,
    taskTitle: string,
    duration: number,
    userId: string
  ): Promise<void> {
    await this.createNotification(
      bookingId,
      userId,
      'time_logged',
      'Time Logged ⏱️',
      `Logged ${duration}h on task "${taskTitle}".`,
      { task_id: taskId, task_title: taskTitle, duration }
    )
  }

  async notifyProgressUpdate(
    bookingId: string,
    progressPercentage: number,
    userId: string
  ): Promise<void> {
    await this.createNotification(
      bookingId,
      userId,
      'progress_update',
      'Progress Update 📊',
      `Project progress updated to ${progressPercentage}%.`,
      { progress_percentage: progressPercentage }
    )
  }

  private async sendRealtimeNotification(
    bookingId: string,
    userId: string,
    notification: {
      type: string
      title: string
      message: string
      data: any
    }
  ): Promise<void> {
    try {
      const supabase = await getSupabaseClient()
      
      // Send to user's notification channel
      await supabase
        .channel(`notifications-${userId}`)
        .send({
          type: 'broadcast',
          event: 'progress_notification',
          payload: {
            ...notification,
            booking_id: bookingId,
            user_id: userId,
            timestamp: new Date().toISOString()
          }
        })

      // Also send to booking channel for real-time updates
      await supabase
        .channel(`progress-${bookingId}`)
        .send({
          type: 'broadcast',
          event: 'notification',
          payload: {
            ...notification,
            booking_id: bookingId,
            user_id: userId,
            timestamp: new Date().toISOString()
          }
        })
    } catch (error) {
      console.error('Error sending real-time notification:', error)
    }
  }

  private channels: Map<string, any> = new Map()

  async subscribeToNotifications(
    userId: string,
    callback: (notification: any) => void
  ): Promise<string> {
    try {
      const supabase = await getSupabaseClient()
      const channelKey = `notifications-${userId}`
      
      const channel = supabase
        .channel(channelKey)
        .on('broadcast', { event: 'progress_notification' }, callback)
        .subscribe()

      this.channels.set(channelKey, channel)
      return channelKey
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      throw error
    }
  }

  async unsubscribeFromNotifications(channelKey: string): Promise<void> {
    try {
      const channel = this.channels.get(channelKey)
      if (channel) {
        const supabase = await getSupabaseClient()
        await supabase.removeChannel(channel)
        this.channels.delete(channelKey)
      }
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error)
    }
  }
}

export const progressNotificationService = ProgressNotificationService.getInstance()
