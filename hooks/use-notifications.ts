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
      const data = await notificationService.getNotifications(userId, filters)
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
      const data = await notificationService.getNotificationStats(userId)
      setStats(data)
    } catch (err) {
      console.error('Error loading notification stats:', err)
    }
  }, [userId])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
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
      await notificationService.markAllAsRead(userId)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      loadStats()
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      throw err
    }
  }, [userId, loadStats])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      loadStats()
    } catch (err) {
      console.error('Error deleting notification:', err)
      throw err
    }
  }, [loadStats])

  const bulkAction = useCallback(async (action: 'mark_read' | 'mark_unread' | 'delete', notificationIds: string[]) => {
    try {
      await notificationService.bulkAction({ action, notification_ids: notificationIds })
      
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
      const notification = await notificationService.createNotification(
        userId,
        type as any,
        title,
        message,
        data,
        priority as any
      )
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
      const data = await notificationService.getNotificationSettings(userId)
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
      const data = await notificationService.updateNotificationSettings(userId, newSettings)
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
