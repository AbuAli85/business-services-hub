'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Notification, NotificationStats } from '@/types/notifications'
import { notificationService } from '@/lib/notification-service'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'

interface NotificationBellProps {
  userId: string
  className?: string
}

export function NotificationBell({ userId, className = '' }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (userId) {
      loadRecentNotifications()
      loadStats()
    }
  }, [userId])

  // Realtime subscription to notifications for this user
  useEffect(() => {
    let isMounted = true
    const setup = async () => {
      if (!userId) return
      try {
        const supabase = await getSupabaseClient()
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current)
          channelRef.current = null
        }
        const channel = supabase
          .channel(`notifications-${userId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          }, (payload: any) => {
            if (!isMounted) return
            // Keep the bell fast: update the in-memory list for unread view and refresh stats
            if (payload.eventType === 'INSERT' && payload.new) {
              setNotifications(prev => [payload.new, ...prev].slice(0, 5))
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n))
            } else if (payload.eventType === 'DELETE' && payload.old) {
              setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
            }
            loadStats()
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              loadRecentNotifications()
              loadStats()
            }
          })

        channelRef.current = channel
      } catch (e) {
        console.warn('NotificationBell realtime setup failed:', e)
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
  }, [userId])

  const loadRecentNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getNotifications(userId, { read: false }, 5)
      setNotifications(data)
    } catch (error) {
      console.error('Error loading recent notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await notificationService.getNotificationStats(userId)
      setStats(data)
    } catch (error) {
      console.error('Error loading notification stats:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      loadStats()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(userId)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      loadStats()
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-blue-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const unreadCount = stats?.unread || 0

  return (
    <div className={className}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
            {stats && (
              <p className="text-sm text-gray-600 mt-1">
                {stats.unread} unread of {stats.total} total
              </p>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No unread notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="p-3 border-b last:border-b-0"
                  onSelect={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id)
                    }
                    if (notification.action_url) {
                      window.location.href = notification.action_url
                    }
                  }}
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityColor(notification.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
          
          {notifications.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => {
                    setIsOpen(false)
                    window.location.href = '/dashboard/notifications'
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
