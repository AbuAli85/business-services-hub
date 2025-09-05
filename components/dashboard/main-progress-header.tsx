'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, CheckCircle, AlertCircle, Target, TrendingUp, LogIn, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Milestone, BookingProgress } from '@/types/progress'
import { getEstimatedCompletionDate, isMilestoneOverdue } from '@/lib/progress-calculations'
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface MainProgressHeaderProps {
  bookingProgress: BookingProgress | null
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  loading?: boolean
  onLogHours?: () => void
  onSendUpdate?: () => void
  onScheduleFollowUp?: () => void
  onSendPaymentReminder?: () => void
}

export function MainProgressHeader({
  bookingProgress,
  milestones,
  userRole,
  loading = false,
  onLogHours,
  onSendUpdate,
  onScheduleFollowUp,
  onSendPaymentReminder
}: MainProgressHeaderProps) {
  const [estimatedCompletion, setEstimatedCompletion] = useState<Date | null>(null)
  const [overdueCount, setOverdueCount] = useState(0)
  const [upcomingDeadlines, setUpcomingDeadlines] = useState(0)
  const [totalHours, setTotalHours] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)

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
      
      // Calculate real task data
      const allTasks = milestones.flatMap(m => m.tasks || [])
      const completed = allTasks.filter(t => t.status === 'completed').length
      const total = allTasks.length
      
      // Calculate real hours from tasks
      const hours = allTasks.reduce((sum, task) => {
        return sum + (task.actual_hours || 0)
      }, 0)
      
      setOverdueCount(overdue)
      setUpcomingDeadlines(upcoming)
      setCompletedTasks(completed)
      setTotalTasks(total)
      setTotalHours(hours)
    }
  }, [milestones])

  if (loading || !bookingProgress) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalMilestones = milestones.length
  const remainingMilestones = totalMilestones - completedMilestones

  return (
    <TooltipProvider>
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        {/* Header with Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{bookingProgress.booking_title}</h1>
          <p className="text-gray-600">Project Progress Tracking</p>
        </div>

        {/* 2x2 Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
        {/* Top-left: Circular Progress */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-3">
                <svg className="w-24 h-24 sm:w-32 sm:h-32 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - bookingProgress.booking_progress / 100)}`}
                    className="text-blue-600 transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{bookingProgress.booking_progress}%</div>
                    <div className="text-xs text-gray-600">Complete</div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-900">Overall Progress</div>
                <div className="text-xs text-gray-600">
                  {completedMilestones} of {totalMilestones} milestones
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Overall project completion based on milestone progress</p>
            <p className="text-xs text-gray-400 mt-1">
              {completedMilestones} of {totalMilestones} milestones completed
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Top-right: Completed Milestones */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-green-600">{completedMilestones}</div>
                <div className="text-sm text-green-700">Completed Milestones</div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Milestones that have been finished and approved</p>
            <p className="text-xs text-gray-400 mt-1">
              {completedMilestones} completed out of {totalMilestones} total
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Bottom-left: Remaining Milestones */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
              <div className="text-center">
                <Target className="h-12 w-12 text-orange-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-orange-600">{remainingMilestones}</div>
                <div className="text-sm text-orange-700">Remaining Milestones</div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Milestones still in progress or pending</p>
            <p className="text-xs text-gray-400 mt-1">
              {remainingMilestones} remaining out of {totalMilestones} total
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Bottom-right: Hours Logged */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
              <div className="text-center">
                <Clock className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-purple-600">{totalHours.toFixed(1)}h</div>
                <div className="text-sm text-purple-700">Hours Logged</div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total time spent on this project</p>
            <p className="text-xs text-gray-400 mt-1">
              {completedTasks} of {totalTasks} tasks completed
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
        {onLogHours && (
          <Button 
            onClick={onLogHours}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Log Hours
          </Button>
        )}
        {onSendUpdate && (
          <Button 
            onClick={onSendUpdate}
            variant="outline"
            className="px-6 py-2"
          >
            Send Progress Update
          </Button>
        )}
        {onScheduleFollowUp && (
          <Button 
            onClick={onScheduleFollowUp}
            variant="outline"
            className="px-6 py-2"
          >
            Schedule Follow-up
          </Button>
        )}
        {onSendPaymentReminder && (
          <Button 
            onClick={onSendPaymentReminder}
            variant="outline"
            className="px-6 py-2"
          >
            Send Payment Reminder
          </Button>
        )}
      </div>

      {/* Estimated Completion */}
      {estimatedCompletion && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-700">
              Estimated completion: <span className="font-semibold">{estimatedCompletion.toLocaleDateString()}</span>
              <span className="ml-2 text-gray-500">
                ({Math.ceil((estimatedCompletion.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining)
              </span>
            </span>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}
