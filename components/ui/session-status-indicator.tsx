'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Clock, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'

interface SessionStatusIndicatorProps {
  className?: string
  showDetails?: boolean
}

export function SessionStatusIndicator({ className = '', showDetails = false }: SessionStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [lastSeen, setLastSeen] = useState<Date>(new Date())
  const [sessionStatus, setSessionStatus] = useState({
    isWarning: false,
    timeRemaining: 0,
    isInactive: false,
    inactivityTimeRemaining: 0,
    isExpired: false
  })

  // Get session status from the parent SessionManager context instead of creating our own
  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          setSessionStatus(prev => ({ ...prev, isExpired: true }))
          return
        }

        const now = Math.floor(Date.now() / 1000)
        const expiresAt = session.expires_at || 0
        const timeUntilExpiry = Math.max(0, expiresAt - now)
        
        setSessionStatus(prev => ({
          ...prev,
          isExpired: timeUntilExpiry <= 0,
          isWarning: timeUntilExpiry <= 300 && timeUntilExpiry > 0, // 5 minutes warning
          timeRemaining: timeUntilExpiry,
          isInactive: false, // We don't track inactivity here to avoid conflicts
          inactivityTimeRemaining: 0
        }))
      } catch (error) {
        console.warn('Session status check failed:', error)
        setSessionStatus(prev => ({ ...prev, isExpired: true }))
      }
    }

    // Check immediately
    checkSessionStatus()
    
    // Check every 60 seconds to match SessionManager
    const interval = setInterval(checkSessionStatus, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const { isWarning, timeRemaining, isInactive, inactivityTimeRemaining, isExpired } = sessionStatus

  // Format time helper function
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
