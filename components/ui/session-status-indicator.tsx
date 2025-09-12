'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Clock, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { useSessionTimeout } from '@/hooks/use-session-timeout'

interface SessionStatusIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function SessionStatusIndicator({ className = '', showDetails = false }: SessionStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [lastSeen, setLastSeen] = useState<Date>(new Date())

  const {
    isWarning,
    timeRemaining,
    isInactive,
    inactivityTimeRemaining,
    isExpired,
    formatTime
  } = useSessionTimeout({
    warningTime: 300, // 5 minutes
    inactivityTimeout: 1800, // 30 minutes
    checkInterval: 30 // 30 seconds
  })

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastSeen(new Date())
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update last seen timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSeen(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = () => {
    if (isExpired) return 'bg-red-100 text-red-800 border-red-200'
    if (isInactive) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (isWarning) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    if (!isOnline) return 'bg-gray-100 text-gray-800 border-gray-200'
    return 'bg-green-100 text-green-800 border-green-200'
  }

  const getStatusIcon = () => {
    if (isExpired) return <WifiOff className="h-3 w-3" />
    if (isInactive) return <Clock className="h-3 w-3" />
    if (isWarning) return <AlertTriangle className="h-3 w-3" />
    if (!isOnline) return <WifiOff className="h-3 w-3" />
    return <Wifi className="h-3 w-3" />
  }

  const getStatusText = () => {
    if (isExpired) return 'Session Expired'
    if (isInactive) return 'Inactive'
    if (isWarning) return 'Expiring Soon'
    if (!isOnline) return 'Offline'
    return 'Active'
  }

  const getTooltipContent = () => {
    if (isExpired) return 'Your session has expired. Please sign in again.'
    if (isInactive) return `You will be logged out in ${formatTime(inactivityTimeRemaining)} due to inactivity.`
    if (isWarning) return `Your session will expire in ${formatTime(timeRemaining)}. Click to refresh.`
    if (!isOnline) return 'You are currently offline. Some features may not work.'
    return `Session is active. Last seen: ${lastSeen.toLocaleTimeString()}`
  }

  if (showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <TooltipProvider>
          <Tooltip content={getTooltipContent()}>
            <Badge className={`${getStatusColor()} text-xs border`}>
              {getStatusIcon()}
              <span className="ml-1">{getStatusText()}</span>
            </Badge>
          </Tooltip>
        </TooltipProvider>
        
        {(isWarning || isInactive) && (
          <div className="text-xs text-gray-500">
            {isInactive ? formatTime(inactivityTimeRemaining) : formatTime(timeRemaining)}
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip content={getTooltipContent()}>
        <div className={`inline-flex items-center ${className}`}>
          <Badge className={`${getStatusColor()} text-xs border`}>
            {getStatusIcon()}
          </Badge>
        </div>
      </Tooltip>
    </TooltipProvider>
  )
}
