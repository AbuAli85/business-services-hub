'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  X,
  Bell
} from 'lucide-react'

interface ServiceNotification {
  id: string
  type: 'approval' | 'rejection' | 'pending'
  title: string
  message: string
  serviceTitle: string
  timestamp: string
  read: boolean
}

interface ServiceNotificationProps {
  notifications: ServiceNotification[]
  onMarkAsRead: (id: string) => void
  onDismiss: (id: string) => void
}

export function ServiceNotificationComponent({ 
  notifications, 
  onMarkAsRead, 
  onDismiss 
}: ServiceNotificationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'rejection':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />
    }
  }

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'approval':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejection':
        return <Badge variant="destructive">Rejected</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">Info</Badge>
    }
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Service Notifications</h3>
            <p className="text-sm text-gray-600">Updates about your services</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b hover:bg-gray-50 ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        {getNotificationBadge(notification.type)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        Service: {notification.serviceTitle}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1 ml-2">
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMarkAsRead(notification.id)}
                        className="h-6 px-2 text-xs"
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDismiss(notification.id)}
                      className="h-6 px-2 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {notifications.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Hook for managing service notifications
export function useServiceNotifications() {
  const [notifications, setNotifications] = useState<ServiceNotification[]>([])

  const addNotification = (notification: Omit<ServiceNotification, 'id' | 'read'>) => {
    const newNotification: ServiceNotification = {
      ...notification,
      id: Date.now().toString(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    )
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== id)
    )
  }

  const clearAll = () => {
    setNotifications([])
  }

  return {
    notifications,
    addNotification,
    markAsRead,
    dismissNotification,
    clearAll
  }
}
