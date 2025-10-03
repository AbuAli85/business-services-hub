'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Bell, 
  BellOff, 
  Check, 
  X, 
  Trash2, 
  Filter, 
  Search, 
  MoreVertical,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Star
} from 'lucide-react'
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationFilters,
  NotificationStats 
} from '@/types/notifications'
import { notificationService } from '@/lib/notification-service'
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface NotificationCenterProps {
  userId: string
  className?: string
}

interface GroupedNotification extends Notification {
  _groupCount?: number
}

export function NotificationCenter({ userId, className = '' }: NotificationCenterProps) {
  const { notifications, loading, error, refresh } = useRealtimeNotifications({ userId })
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [filters, setFilters] = useState<NotificationFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadStats()
  }, [userId])

  // Group + filter notifications based on active tab and filters
  const filteredNotifications = React.useMemo<GroupedNotification[]>(() => {
    let filtered = notifications

    // Apply tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read)
    } else if (activeTab === 'urgent') {
      filtered = filtered.filter(n => n.priority === 'urgent')
    } else if (activeTab === 'recent') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      filtered = filtered.filter(n => new Date(n.created_at) > oneDayAgo)
    }

    // Apply additional filters
    if (filters.type) {
      filtered = filtered.filter(n => n.type === filters.type)
    }
    if (filters.priority) {
      filtered = filtered.filter(n => n.priority === filters.priority)
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(searchLower) || 
        n.message.toLowerCase().includes(searchLower)
      )
    }

    // Group similar notifications by a stable key and aggregate counts
    const groups = new Map<string, { key: string; latest: Notification; count: number }>()
    for (const n of filtered) {
      const key = `${n.type}|${n.priority}|${n.title}|${n.message}`
      if (!groups.has(key)) {
        groups.set(key, { key, latest: n, count: (n as any)?.data?.duplicate_count || 1 })
      } else {
        const g = groups.get(key)!
        // keep the most recent as representative, add counts
        const newer = new Date(n.created_at) > new Date(g.latest.created_at) ? n : g.latest
        const extra = ((n as any)?.data?.duplicate_count || 1)
        groups.set(key, { key, latest: newer, count: g.count + extra })
      }
    }
    // Transform back to list with a count
    const groupedList: GroupedNotification[] = Array.from(groups.values())
      .sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime())
      .map(g => ({ ...(g.latest as Notification), _groupCount: g.count }))

    return groupedList
  }, [notifications, activeTab, filters])

  const loadNotifications = async () => {
    try {
      await refresh()
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error('Failed to load notifications')
    }
  }

  const loadStats = async () => {
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
      
      setStats({ 
        total: allNotifications.length, 
        unread, 
        by_type,
        by_priority,
        recent_count: recentCount 
      })
    } catch (error) {
      console.error('Error loading notification stats:', error)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      notificationService.markAsRead(notificationId)
      // The real-time subscription will automatically update the notification
      loadStats()
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      notificationService.markAllAsRead()
      // The real-time subscription will automatically update the notifications
      loadStats()
      toast.success('All notifications marked as read')
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      notificationService.deleteNotification(notificationId)
      // The real-time subscription will automatically remove the notification
      loadStats()
      toast.success('Notification deleted')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    }
  }

  const handleBulkAction = async (action: 'mark_read' | 'mark_unread' | 'delete') => {
    if (selectedNotifications.length === 0) return

    try {
      notificationService.bulkAction({
        action,
        notification_ids: selectedNotifications
      })
      
      // The real-time subscription will automatically update the notifications
      
      setSelectedNotifications([])
      loadStats()
      toast.success(`Bulk action completed: ${action}`)
    } catch (error) {
      console.error('Error performing bulk action:', error)
      toast.error('Failed to perform bulk action')
    }
  }

  const handleSelectNotification = (notificationId: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications(prev => [...prev, notificationId])
    } else {
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    } else {
      setSelectedNotifications([])
    }
  }

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'normal': return <Info className="h-4 w-4 text-blue-500" />
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }


  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            {stats ? `${stats.unread} unread of ${stats.total} total` : 'Loading...'}
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-1">
              ⚠️ Real-time updates unavailable - {error}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadNotifications}
            disabled={loading}
          >
            <Clock className="h-4 w-4 mr-2" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={stats?.unread === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Bell className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-2xl font-bold text-red-600">{stats.unread}</p>
                </div>
                <BellOff className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.by_priority.urgent || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent</p>
                  <p className="text-2xl font-bold text-green-600">{stats.recent_count}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <Input
                  placeholder="Search notifications..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select
                  value={filters.type || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    type: value === 'all' ? undefined : value as NotificationType 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="task_created">Task Created</SelectItem>
                    <SelectItem value="task_completed">Task Completed</SelectItem>
                    <SelectItem value="milestone_completed">Milestone Completed</SelectItem>
                    <SelectItem value="booking_created">Booking Created</SelectItem>
                    <SelectItem value="payment_received">Payment Received</SelectItem>
                    <SelectItem value="message_received">Message Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <Select
                  value={filters.priority || 'all'}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    priority: value === 'all' ? undefined : value as NotificationPriority 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select
                  value={filters.read === undefined ? 'all' : filters.read ? 'read' : 'unread'}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    read: value === 'all' ? undefined : value === 'read' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="urgent">Urgent</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedNotifications.length} notification(s) selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction('mark_read')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Mark Read
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction('mark_unread')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Mark Unread
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBulkAction('delete')}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications List */}
          <div className="space-y-2">
            {error ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-red-500 mb-2">
                    <AlertTriangle className="h-8 w-8 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading notifications</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Button onClick={loadNotifications} variant="outline">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <BellOff className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-600">You're all caught up!</p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification: any) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isSelected={selectedNotifications.includes(notification.id)}
                  onSelect={(checked) => handleSelectNotification(notification.id, checked)}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  onDelete={() => handleDeleteNotification(notification.id)}
                  getPriorityIcon={getPriorityIcon}
                  getPriorityColor={getPriorityColor}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface NotificationItemProps {
  notification: GroupedNotification
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onMarkAsRead: () => void
  onDelete: () => void
  getPriorityIcon: (priority: NotificationPriority) => React.ReactNode
  getPriorityColor: (priority: NotificationPriority) => string
}

function NotificationItem({
  notification,
  isSelected,
  onSelect,
  onMarkAsRead,
  onDelete,
  getPriorityIcon,
  getPriorityColor
}: NotificationItemProps) {
  return (
    <Card className={`${!notification.read ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                  {getPriorityIcon(notification.priority)}
                  <h3 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                    {notification.title}
                  </h3>
                  <Badge className={getPriorityColor(notification.priority)}>
                    {notification.priority}
                  </Badge>
                {notification._groupCount && notification._groupCount > 1 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {notification._groupCount} similar
                  </Badge>
                )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                  {notification.action_url && (
                    <a
                      href={notification.action_url}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {notification.action_label || 'View Details'}
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                {!notification.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onMarkAsRead}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  title="Delete"
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
