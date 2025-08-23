'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'

interface NotificationBellProps {
  count?: number
  onClick?: () => void
}

export function NotificationBell({ count = 0, onClick }: NotificationBellProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
        >
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </Button>
  )
}
