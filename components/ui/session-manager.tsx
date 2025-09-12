'use client'

import { useEffect, useState } from 'react'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { SessionTimeoutModal } from './session-timeout-modal'
import { toast } from 'react-hot-toast'

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

  // Show modal when warning or inactivity detected
  useEffect(() => {
    const shouldShowModal = (isWarning || isInactive) && !isExpired
    const now = Date.now()
    
    // Prevent modal spam - only show once per warning cycle
    if (shouldShowModal && (now - lastWarningTime) > 10000) { // 10 seconds cooldown
      setShowModal(true)
      setLastWarningTime(now)
    } else if (!shouldShowModal) {
      setShowModal(false)
    }
  }, [isWarning, isInactive, isExpired, lastWarningTime])

  // Handle session refresh
  const handleRefresh = async () => {
    const success = await refreshSession()
    if (success) {
      setShowModal(false)
      resetActivity()
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

  // Show toast notifications for critical warnings
  useEffect(() => {
    if (isWarning && timeRemaining <= 60) {
      toast.error(`Session expires in ${formatTime(timeRemaining)}!`, {
        duration: 5000,
        position: 'top-center'
      })
    }
  }, [isWarning, timeRemaining, formatTime])

  useEffect(() => {
    if (isInactive && inactivityTimeRemaining <= 30) {
      toast.error(`Inactivity timeout in ${formatTime(inactivityTimeRemaining)}!`, {
        duration: 5000,
        position: 'top-center'
      })
    }
  }, [isInactive, inactivityTimeRemaining, formatTime])

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
