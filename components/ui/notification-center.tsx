'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2, 
  Settings,
  Filter,
  Search,
  MoreHorizontal,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { notificationService, NotificationData } from '@/lib/notifications'
import { formatDistanceToNow } from 'date-fns'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'progress' | 'status' | 'message' | 'payment' | 'deadline' | 'system'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications)
    return unsubscribe
  }, [])

  const filteredNotifications = notifications.filter(notification => {
    const matchesFilter = filter === 'all' || 
                         (filter === 'unread' && !notification.read) ||
                         notification.type === filter
    
    const matchesSearch = searchQuery === '' ||
                         notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const unreadCount = notificationService.getUnreadCount()

  const getNotificationIcon = (type: string, priority: string) => {
    const iconClass = priority === 'urgent' ? 'text-red-500' :
                     priority === 'high' ? 'text-orange-500' :
                     priority === 'normal' ? 'text-blue-500' : 'text-green-500'

    switch (type) {
      case 'progress':
        return <CheckCircle className={`h-4 w-4 ${iconClass}`} />
      case 'status':
        return <RefreshCw className={`h-4 w-4 ${iconClass}`} />
      case 'message':
        return <MessageSquare className={`h-4 w-4 ${iconClass}`} />
      case 'payment':
        return <CreditCard className={`h-4 w-4 ${iconClass}`} />
      case 'deadline':
        return <Clock className={`h-4 w-4 ${iconClass}`} />
      case 'system':
        return <Bell className={`h-4 w-4 ${iconClass}`} />
      default:
        return <Info className={`h-4 w-4 ${iconClass}`} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 border-red-200 text-red-800'
      case 'high':
        return 'bg-orange-100 border-orange-200 text-orange-800'
      case 'normal':
        return 'bg-blue-100 border-blue-200 text-blue-800'
      case 'low':
        return 'bg-green-100 border-green-200 text-green-800'
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-start justify-end p-4">
      <Card className="w-96 max-h-[80vh] shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => notificationService.markAllAsRead()}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search and Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex flex-wrap gap-1">
              {['all', 'unread', 'progress', 'status', 'message', 'payment', 'deadline', 'system'].map((filterType) => (
                <Button
                  key={filterType}
                  variant={filter === filterType ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(filterType as any)}
                  className="text-xs capitalize"
                >
                  {filterType}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-96">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <BellOff className="h-12 w-12 mb-2" />
                <p className="text-sm">No notifications found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-l-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
                    }`}
                    onClick={() => notificationService.markAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type, notification.priority)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </Badge>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          
                          {notification.bookingId && (
                            <Badge variant="outline" className="text-xs">
                              Booking
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// Import missing icons
import { RefreshCw, MessageSquare, CreditCard, X } from 'lucide-react'
