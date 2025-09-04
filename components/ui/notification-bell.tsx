'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, X, AlertCircle, Clock, CheckCircle, DollarSign, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { getSupabaseClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  type: 'booking' | 'task' | 'milestone' | 'approval' | 'overdue' | 'payment' | 'system'
  title: string
  message: string
  link?: string
  data?: any
  status: 'unread' | 'read' | 'archived'
  created_at: string
  read_at?: string
}

interface NotificationBellProps {
  userId: string
  className?: string
}

export default function NotificationBell({ userId, className = '' }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadNotifications()
      setupRealtimeSubscription()
    }
  }, [userId])

  const loadNotifications = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => n.status === 'unread').length || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = async () => {
    const supabase = await getSupabaseClient()
    
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          
          // Show toast for new notifications
          toast.custom(t => (
            <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black/5 border p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getNotificationIcon(newNotification.type)}
                </div>
                <div className="ml-3 w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{newNotification.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{newNotification.message}</p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const getNotificationIcon = (type: string) => {
    const icons = {
      booking: <MessageSquare className="h-5 w-5 text-blue-600" />,
      task: <CheckCircle className="h-5 w-5 text-green-600" />,
      milestone: <Clock className="h-5 w-5 text-purple-600" />,
      approval: <Check className="h-5 w-5 text-orange-600" />,
      overdue: <AlertCircle className="h-5 w-5 text-red-600" />,
      payment: <DollarSign className="h-5 w-5 text-green-600" />,
      system: <Bell className="h-5 w-5 text-gray-600" />
    }
    return icons[type as keyof typeof icons] || <Bell className="h-5 w-5 text-gray-600" />
  }

  const getNotificationColor = (type: string) => {
    const colors = {
      booking: 'text-blue-600 bg-blue-50',
      task: 'text-green-600 bg-green-50',
      milestone: 'text-purple-600 bg-purple-50',
      approval: 'text-orange-600 bg-orange-50',
      overdue: 'text-red-600 bg-red-50',
      payment: 'text-green-600 bg-green-50',
      system: 'text-gray-600 bg-gray-50'
    }
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'unread')

      if (error) throw error

      setNotifications(prev => 
        prev.map(n => ({ ...n, status: 'read' as const, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    }
  }

  const archiveNotification = async (notificationId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error archiving notification:', error)
    }
  }

  if (loading) {
    return (
      <Button variant="outline" size="icon" className={className}>
        <Bell className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative ${className}`}
        aria-label="Notifications"
        title="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 z-50">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification, index) => (
                      <div key={notification.id}>
                        <div
                          className={`p-4 hover:bg-gray-50 cursor-pointer ${
                            notification.status === 'unread' ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                          onClick={() => {
                            if (notification.status === 'unread') {
                              markAsRead(notification.id)
                            }
                            if (notification.link) {
                              window.location.href = notification.link
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm font-medium ${
                                  notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {notification.title}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    archiveNotification(notification.id)
                                  }}
                                  className="text-gray-400 hover:text-gray-600"
                                  aria-label="Archive notification"
                                  title="Archive notification"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                        {index < notifications.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}