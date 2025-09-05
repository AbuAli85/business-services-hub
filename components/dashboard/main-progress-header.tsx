'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, CheckCircle, AlertCircle, Target, TrendingUp, LogIn } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Milestone, BookingProgress } from '@/types/progress'
import { getEstimatedCompletionDate, isMilestoneOverdue } from '@/lib/progress-calculations'

interface MainProgressHeaderProps {
  bookingProgress: BookingProgress | null
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onLogHours?: () => void
  onSendUpdate?: () => void
  onScheduleFollowUp?: () => void
  onSendPaymentReminder?: () => void
}

export function MainProgressHeader({
  bookingProgress,
  milestones,
  userRole,
  onLogHours,
  onSendUpdate,
  onScheduleFollowUp,
  onSendPaymentReminder
}: MainProgressHeaderProps) {
  const [estimatedCompletion, setEstimatedCompletion] = useState<Date | null>(null)
  const [overdueCount, setOverdueCount] = useState(0)
  const [upcomingDeadlines, setUpcomingDeadlines] = useState(0)

  useEffect(() => {
    if (milestones.length > 0) {
      const completion = getEstimatedCompletionDate(milestones)
      setEstimatedCompletion(completion)
      
      // Calculate overdue and upcoming milestones
      const overdue = milestones.filter(m => isMilestoneOverdue(m)).length
      const upcoming = milestones.filter(m => {
        if (!m.due_date || m.status === 'completed') return false
        const daysUntilDue = Math.ceil((new Date(m.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        return daysUntilDue >= 0 && daysUntilDue <= 7
      }).length
      
      setOverdueCount(overdue)
      setUpcomingDeadlines(upcoming)
    }
  }, [milestones])

  if (!bookingProgress) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalMilestones = milestones.length
  const remainingMilestones = totalMilestones - completedMilestones

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      {/* Header with Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{bookingProgress.booking_title}</h1>
        <p className="text-gray-600">Project Progress Tracking</p>
      </div>

      {/* Main Progress Circle and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Circular Progress - Larger */}
        <div className="flex flex-col items-center">
          <div className="relative w-40 h-40 mb-4">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - bookingProgress.booking_progress / 100)}`}
                className="text-blue-600 transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900">{bookingProgress.booking_progress}%</div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Overall Progress</div>
            <div className="text-xs text-gray-500">
              {completedMilestones} of {totalMilestones} milestones
            </div>
          </div>
        </div>

        {/* Milestone Stats Cards */}
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{completedMilestones}</div>
          <div className="text-sm text-green-700">Completed</div>
        </div>

        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600">{remainingMilestones}</div>
          <div className="text-sm text-blue-700">Remaining</div>
        </div>

        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600">{bookingProgress.total_actual_hours.toFixed(1)}h</div>
          <div className="text-sm text-purple-700">Hours Logged</div>
        </div>
      </div>

      {/* Estimated Completion & Action Buttons */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {estimatedCompletion && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Estimated Completion</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {estimatedCompletion.toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">
              {Math.ceil((estimatedCompletion.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {onLogHours && (
            <Button 
              onClick={onLogHours}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Log Hours
            </Button>
          )}
          {onSendUpdate && (
            <Button 
              onClick={onSendUpdate}
              variant="outline"
            >
              Send Progress Update
            </Button>
          )}
          {onScheduleFollowUp && (
            <Button 
              onClick={onScheduleFollowUp}
              variant="outline"
            >
              Schedule Follow-up
            </Button>
          )}
          {onSendPaymentReminder && (
            <Button 
              onClick={onSendPaymentReminder}
              variant="outline"
            >
              Send Payment Reminder
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
