'use client'

import { useEffect, useState } from 'react'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { SessionTimeoutModal } from './session-timeout-modal'
import { toast } from 'sonner'

interface SessionManagerProps {
  children: React.ReactNode
  config?: {
    warningTime?: number
    inactivityTimeout?: number
    checkInterval?: number
  }
}

export function SessionManager({ children, config = {} }: SessionManagerProps) {
  const [showModal, setShowModal] = useState(false)
  const [lastWarningTime, setLastWarningTime] = useState(0)
  const [autoRefreshAttempted, setAutoRefreshAttempted] = useState(false)

  const {
    isWarning,
    timeRemaining,
    isInactive,
    inactivityTimeRemaining,
    isExpired,
    refreshSession,
    resetActivity,
    formatTime
  } = useSessionTimeout(config)

  // Auto-refresh session silently when warning first appears
  useEffect(() => {
    if (isWarning && !autoRefreshAttempted && timeRemaining > 60) {
      setAutoRefreshAttempted(true)
      console.log('🔄 Auto-refreshing session silently...')
      refreshSession().then(success => {
        if (success) {
          console.log('✅ Session auto-refreshed successfully')
          resetActivity()
        } else {
          console.log('❌ Auto-refresh failed, will show modal')
        }
      })
    }
  }, [isWarning, timeRemaining, autoRefreshAttempted, refreshSession, resetActivity])

  // Show modal only for critical situations (under 2 minutes or auto-refresh failed)
  useEffect(() => {
    const shouldShowModal = (isWarning || isInactive) && !isExpired && timeRemaining <= 120
    const now = Date.now()
    
    // Prevent modal spam - only show once per 30 seconds
    if (shouldShowModal && (now - lastWarningTime) > 30000) {
      setShowModal(true)
      setLastWarningTime(now)
    } else if (!shouldShowModal) {
      setShowModal(false)
    }
  }, [isWarning, isInactive, isExpired, timeRemaining, lastWarningTime])

  // Handle session refresh
  const handleRefresh = async () => {
    const success = await refreshSession()
    if (success) {
      setShowModal(false)
      resetActivity()
      setAutoRefreshAttempted(false)
      toast.success('Session refreshed successfully', {
        duration: 2000
      })
    }
  }

  // Handle logout
  const handleLogout = () => {
    setShowModal(false)
    // The hook will handle the actual logout
  }

  // Handle modal close
  const handleClose = () => {
    setShowModal(false)
    // Reset activity when user dismisses modal
    resetActivity()
  }

  // Subtle toast notification only for very critical warnings (under 1 minute)
  useEffect(() => {
    if (isWarning && timeRemaining <= 60 && timeRemaining > 0) {
      toast.warning(`Session expires in ${formatTime(timeRemaining)}`, {
        duration: 3000,
        position: 'bottom-right',
        description: 'Click to refresh your session'
      })
    }
  }, [isWarning, timeRemaining, formatTime])

  // Don't show inactivity warnings via toast - let the modal handle it
  // This reduces notification spam

  return (
    <>
      {children}
      <SessionTimeoutModal
        isOpen={showModal}
        timeRemaining={timeRemaining}
        isInactive={isInactive}
        inactivityTimeRemaining={inactivityTimeRemaining}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
        onClose={handleClose}
      />
    </>
  )
}
