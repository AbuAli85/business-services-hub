'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Notification, NotificationStats, NotificationFilters, NotificationSettings as NotificationSettingsType } from '@/types/notifications'
import { notificationService } from '@/lib/notification-service'
import { getSupabaseClient } from '@/lib/supabase'

interface UseNotificationsOptions {
  userId: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useNotifications({ 
  userId, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<any>(null)

  const loadNotifications = useCallback(async (filters?: NotificationFilters) => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const data = notificationService.getAllNotifications()
      setNotifications(data)
    } catch (err) {
      console.error('Error loading notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadStats = useCallback(async () => {
    if (!userId) return

    try {
      const allNotifications = notificationService.getAllNotifications()
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
      
      const data = { 
        total: allNotifications.length, 
        unread, 
        by_type,
        by_priority,
        recent_count: recentCount 
      }
      setStats(data)
    } catch (err) {
      console.error('Error loading notification stats:', err)
    }
  }, [userId])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      notificationService.markAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      loadStats()
    } catch (err) {
      console.error('Error marking notification as read:', err)
      throw err
    }
  }, [loadStats])

  const markAllAsRead = useCallback(async () => {
    try {
      notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      loadStats()
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      throw err
    }
  }, [userId, loadStats])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      notificationService.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      loadStats()
    } catch (err) {
      console.error('Error deleting notification:', err)
      throw err
    }
  }, [loadStats])

  const bulkAction = useCallback(async (action: 'mark_read' | 'mark_unread' | 'delete', notificationIds: string[]) => {
    try {
      notificationService.bulkAction({ action, notification_ids: notificationIds })
      
      if (action === 'delete') {
        setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)))
      } else {
        setNotifications(prev => 
          prev.map(n => 
            notificationIds.includes(n.id) 
              ? { ...n, read: action === 'mark_read' }
              : n
          )
        )
      }
      
      loadStats()
    } catch (err) {
      console.error('Error performing bulk action:', err)
      throw err
    }
  }, [loadStats])

  const createNotification = useCallback(async (
    type: string,
    title: string,
    message: string,
    data?: any,
    priority: string = 'normal'
  ) => {
    try {
      // Create notification manually since createNotification doesn't exist
      const notification: any = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: type as any,
        priority: priority as any,
        title,
        message,
        timestamp: new Date(),
        read: false,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      // Add to service
      (notificationService as any).notifications.push(notification)
      setNotifications(prev => [notification, ...prev])
      loadStats()
      return notification
    } catch (err) {
      console.error('Error creating notification:', err)
      throw err
    }
  }, [userId, loadStats])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !userId) return

    const interval = setInterval(() => {
      loadNotifications()
      loadStats()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, userId, loadNotifications, loadStats])

  // Initial load
  useEffect(() => {
    if (userId) {
      loadNotifications()
      loadStats()
    }
  }, [userId, loadNotifications, loadStats])

  // Realtime subscription
  useEffect(() => {
    let isMounted = true
    const setup = async () => {
      if (!userId) return

      try {
        const supabase = await getSupabaseClient()

        // Cleanup any existing channel first
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }

        // Create filter string inside the useEffect where userId is available
        const userFilter = `user_id=eq.${userId}`

        const channel = supabase
          .channel(`notifications-${userId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: userFilter
          }, (payload: any) => {
            // Lightweight state updates; fallback to refetch for safety
            if (!isMounted) return

            if (payload.eventType === 'INSERT' && payload.new) {
              setNotifications(prev => [payload.new, ...prev])
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n))
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
            }
            // Refresh stats in background
            loadStats()
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Optionally do an immediate light refresh to sync
              loadNotifications()
              loadStats()
            }
          })

        channelRef.current = channel
      } catch (e) {
        console.warn('Notifications realtime setup failed:', e)
      }
    }

    setup()

    return () => {
      isMounted = false
      ;(async () => {
        try {
          const supabase = await getSupabaseClient()
          if (channelRef.current) {
            await supabase.removeChannel(channelRef.current)
            channelRef.current = null
          }
        } catch {}
      })()
    }
  }, [userId, loadNotifications, loadStats])

  return {
    notifications,
    stats,
    loading,
    error,
    loadNotifications,
    loadStats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkAction,
    createNotification,
    refetch: () => {
      loadNotifications()
      loadStats()
    }
  }
}

// Hook for notification settings
export function useNotificationSettings(userId: string) {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const data = notificationService.getNotificationSettings(userId)
      setSettings(data)
    } catch (err) {
      console.error('Error loading notification settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettingsType>) => {
    try {
      notificationService.updateNotificationSettings(userId, newSettings)
      const data = notificationService.getNotificationSettings(userId)
      setSettings(data)
    } catch (err) {
      console.error('Error updating notification settings:', err)
      throw err
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      loadSettings()
    }
  }, [userId, loadSettings])

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateSettings
  }
}
