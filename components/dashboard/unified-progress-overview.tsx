'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, CheckCircle, AlertCircle, Target, TrendingUp } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Milestone, Task, BookingProgress } from '@/types/progress'

interface UnifiedProgressOverviewProps {
  bookingProgress: BookingProgress | null
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onLogHours?: () => void
  onSendUpdate?: () => void
  onScheduleFollowUp?: () => void
  onSendPaymentReminder?: () => void
}

export function UnifiedProgressOverview({
  bookingProgress,
  milestones,
  userRole,
  onLogHours,
  onSendUpdate,
  onScheduleFollowUp,
  onSendPaymentReminder
}: UnifiedProgressOverviewProps) {
  const [estimatedCompletion, setEstimatedCompletion] = useState<Date | null>(null)
  const [overdueCount, setOverdueCount] = useState(0)
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<number>(0)

  useEffect(() => {
    calculateEstimatedCompletion()
    calculateOverdueAndUpcoming()
  }, [milestones, bookingProgress])

  const calculateEstimatedCompletion = () => {
    if (!milestones.length || !bookingProgress) return

    const completedMilestones = milestones.filter(m => m.status === 'completed')
    const remainingMilestones = milestones.filter(m => m.status !== 'completed')
    
    if (remainingMilestones.length === 0) {
      setEstimatedCompletion(null)
      return
    }

    // Calculate average duration per milestone based on completed ones
    const avgDuration = completedMilestones.length > 0 
      ? completedMilestones.reduce((sum, m) => {
          if (m.created_at && m.updated_at) {
            const duration = new Date(m.updated_at).getTime() - new Date(m.created_at).getTime()
            return sum + duration
          }
          return sum
        }, 0) / completedMilestones.length
      : 7 * 24 * 60 * 60 * 1000 // Default 7 days per milestone

    // Estimate completion based on remaining milestones
    const estimatedTime = remainingMilestones.length * avgDuration
    const completionDate = new Date(Date.now() + estimatedTime)
    setEstimatedCompletion(completionDate)
  }

  const calculateOverdueAndUpcoming = () => {
    const now = new Date()
    let overdue = 0
    let upcoming = 0

    milestones.forEach(milestone => {
      if (milestone.due_date) {
        const dueDate = new Date(milestone.due_date)
        const daysDiff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff < 0 && milestone.status !== 'completed') {
          overdue++
        } else if (daysDiff >= 0 && daysDiff <= 7 && milestone.status !== 'completed') {
          upcoming++
        }
      }
    })

    setOverdueCount(overdue)
    setUpcomingDeadlines(upcoming)
  }

  const getMilestoneIcon = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('planning') || lowerTitle.includes('plan')) return '📋'
    if (lowerTitle.includes('development') || lowerTitle.includes('dev')) return '⚙️'
    if (lowerTitle.includes('testing') || lowerTitle.includes('test')) return '🧪'
    if (lowerTitle.includes('delivery') || lowerTitle.includes('deploy')) return '🚀'
    return '📌'
  }

  const getMilestoneColor = (title: string) => {
    const lowerTitle = title.toLowerCase()
    if (lowerTitle.includes('planning') || lowerTitle.includes('plan')) return 'blue'
    if (lowerTitle.includes('development') || lowerTitle.includes('dev')) return 'orange'
    if (lowerTitle.includes('testing') || lowerTitle.includes('test')) return 'purple'
    if (lowerTitle.includes('delivery') || lowerTitle.includes('deploy')) return 'green'
    return 'gray'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'on_hold': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

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

  return (
    <div className="space-y-6">
      {/* Primary Progress Indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{bookingProgress.booking_title}</h2>
            <p className="text-gray-600">Project Progress Overview</p>
          </div>
          
          {/* Smart Suggestions Alert Bar */}
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{overdueCount} overdue</span>
              </div>
            )}
            {upcomingDeadlines > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                <Clock className="h-4 w-4" />
                <span>{upcomingDeadlines} due soon</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Circular Progress */}
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - bookingProgress.booking_progress / 100)}`}
                  className="text-blue-600 transition-all duration-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{bookingProgress.booking_progress}%</div>
                  <div className="text-xs text-gray-600">Complete</div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Overall Progress</div>
              <div className="text-xs text-gray-500">
                {bookingProgress.completed_milestones} of {bookingProgress.total_milestones} milestones
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{bookingProgress.completed_tasks}</div>
              <div className="text-sm text-green-700">Completed Tasks</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">{bookingProgress.total_tasks - bookingProgress.completed_tasks}</div>
              <div className="text-sm text-blue-700">Remaining Tasks</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">{bookingProgress.total_actual_hours.toFixed(1)}h</div>
              <div className="text-sm text-purple-700">Hours Logged</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-600">{bookingProgress.total_estimated_hours.toFixed(1)}h</div>
              <div className="text-sm text-orange-700">Estimated</div>
            </div>
          </div>

          {/* Estimated Completion & Actions */}
          <div className="space-y-4">
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
            <div className="space-y-2">
              {onLogHours && (
                <Button 
                  onClick={onLogHours}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Log Hours
                </Button>
              )}
              {onSendUpdate && (
                <Button 
                  onClick={onSendUpdate}
                  variant="outline"
                  className="w-full"
                >
                  Send Progress Update
                </Button>
              )}
              {onScheduleFollowUp && (
                <Button 
                  onClick={onScheduleFollowUp}
                  variant="outline"
                  className="w-full"
                >
                  Schedule Follow-up
                </Button>
              )}
              {onSendPaymentReminder && (
                <Button 
                  onClick={onSendPaymentReminder}
                  variant="outline"
                  className="w-full"
                >
                  Send Payment Reminder
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {milestones.map((milestone) => {
          const color = getMilestoneColor(milestone.title)
          const icon = getMilestoneIcon(milestone.title)
          
          return (
            <div key={milestone.id} className={`bg-white border border-${color}-200 rounded-lg p-4 hover:shadow-md transition-shadow`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-1">{milestone.title}</h3>
                  <Badge className={`text-xs ${getStatusColor(milestone.status)}`}>
                    {milestone.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{milestone.progress_percentage}%</span>
                </div>
                <Progress 
                  value={milestone.progress_percentage} 
                  className="h-2"
                />
                <div className="text-xs text-gray-500">
                  {milestone.tasks?.filter(t => t.status === 'completed').length || 0} of {milestone.tasks?.length || 0} tasks
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
