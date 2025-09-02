'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff } from 'lucide-react'
import { notificationService } from '@/lib/notifications'
import { NotificationCenter } from './notification-center'

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

  useEffect(() => {
    // Check notification permission
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted')
    }

    // Subscribe to notification updates
    const unsubscribe = notificationService.subscribe(() => {
      setUnreadCount(notificationService.getUnreadCount())
    })

    return unsubscribe
  }, [])

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      setHasPermission(permission === 'granted')
    }
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="relative p-2"
        >
          {hasPermission ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {!hasPermission && (
          <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg z-10">
            <div className="flex items-start space-x-2">
              <Bell className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Enable Notifications
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Get notified about important updates and messages
                </p>
                <Button
                  size="sm"
                  onClick={requestNotificationPermission}
                  className="mt-2 text-xs"
                >
                  Enable
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <NotificationCenter 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  )
}