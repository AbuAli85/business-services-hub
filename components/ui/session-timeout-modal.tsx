'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, RefreshCw, LogOut, Clock } from 'lucide-react'

interface SessionTimeoutModalProps {
  isOpen: boolean
  timeRemaining: number
  isInactive: boolean
  inactivityTimeRemaining: number
  onRefresh: () => void
  onLogout: () => void
  onClose: () => void
}

export function SessionTimeoutModal({
  isOpen,
  timeRemaining,
  isInactive,
  inactivityTimeRemaining,
  onRefresh,
  onLogout,
  onClose
}: SessionTimeoutModalProps) {
  const [countdown, setCountdown] = useState(timeRemaining)
  const [inactivityCountdown, setInactivityCountdown] = useState(inactivityTimeRemaining)

  useEffect(() => {
    setCountdown(timeRemaining)
  }, [timeRemaining])

  useEffect(() => {
    setInactivityCountdown(inactivityTimeRemaining)
  }, [inactivityTimeRemaining])

  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      if (isInactive) {
        setInactivityCountdown(prev => Math.max(0, prev - 1))
      } else {
        setCountdown(prev => Math.max(0, prev - 1))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, isInactive])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    if (isInactive) {
      return (inactivityCountdown / 60) * 100 // Assuming 60 seconds warning
    }
    return (countdown / 300) * 100 // Assuming 5 minutes warning
  }

  const getTitle = () => {
    if (isInactive) {
      return 'Session Inactive'
    }
    return 'Session Expiring Soon'
  }

  const getDescription = () => {
    if (isInactive) {
      return `You have been inactive for too long. You will be automatically logged out in ${formatTime(inactivityCountdown)}.`
    }
    return `Your session will expire in ${formatTime(countdown)}. Please refresh your session or save your work.`
  }

  const getIcon = () => {
    if (isInactive) {
      return <Clock className="h-6 w-6 text-orange-500" />
    }
    return <AlertTriangle className="h-6 w-6 text-red-500" />
  }

  const getProgressColor = () => {
    if (isInactive) {
      return 'bg-orange-500'
    }
    return countdown <= 60 ? 'bg-red-500' : 'bg-yellow-500'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {getIcon()}
            <DialogTitle className="text-lg font-semibold">
              {getTitle()}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Time Remaining</span>
              <span className="font-mono font-medium">
                {formatTime(isInactive ? inactivityCountdown : countdown)}
              </span>
            </div>
            <Progress 
              value={getProgressPercentage()} 
              className="h-2"
            />
            <div className={`h-2 rounded-full ${getProgressColor()} transition-all duration-1000`}
                 style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={onRefresh}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Session
            </Button>
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout Now
            </Button>
          </div>

          {/* Warning Message */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Any unsaved work will be lost when the session expires. 
              Please save your work before the timer runs out.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
