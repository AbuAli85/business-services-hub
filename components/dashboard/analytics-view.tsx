'use client'

import { CheckCircle, Clock, AlertCircle, TrendingUp, BarChart3 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Milestone, BookingProgress } from '@/types/progress'

interface AnalyticsViewProps {
  bookingProgress: BookingProgress | null
  milestones: Milestone[]
}

export function AnalyticsView({ bookingProgress, milestones }: AnalyticsViewProps) {
  if (!bookingProgress) return null

  const completedTasks = milestones.reduce((sum, m) => 
    sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0
  )
  const totalTasks = milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)
  const pendingTasks = totalTasks - completedTasks
  const overdueTasks = milestones.reduce((sum, m) => 
    sum + (m.tasks?.filter(t => {
      if (!t.due_date || t.status === 'completed') return false
      return new Date(t.due_date) < new Date()
    }).length || 0), 0
  )

  const weeklyProgress = [
    { week: 1, progress: 0 },
    { week: 2, progress: 15 },
    { week: 3, progress: 35 },
    { week: 4, progress: 60 },
    { week: 5, progress: 80 },
    { week: 6, progress: 95 }
  ]

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Overall Progress</h3>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-gray-900">{bookingProgress.booking_progress}%</div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="30"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - bookingProgress.booking_progress / 100)}`}
                  className="text-blue-600"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Completed Tasks</h3>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{completedTasks}</div>
          <div className="text-sm text-gray-500">of {totalTasks} total</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Hours Logged</h3>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{bookingProgress.total_actual_hours.toFixed(1)}h</div>
          <div className="text-sm text-gray-500">of {bookingProgress.total_estimated_hours.toFixed(1)}h estimated</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Overdue Items</h3>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{overdueTasks}</div>
          <div className="text-sm text-gray-500">needs attention</div>
        </div>
      </div>

      {/* Milestone Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Milestone Progress</h3>
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">{milestone.title}</span>
                  <span className="text-xs text-gray-500">
                    {milestone.tasks?.filter(t => t.status === 'completed').length || 0} of {milestone.tasks?.length || 0} tasks
                  </span>
                </div>
                <Progress value={milestone.progress_percentage} className="h-2" />
              </div>
              <div className="ml-4 text-right">
                <div className="text-sm font-semibold text-gray-900">{milestone.progress_percentage}%</div>
                <div className="text-xs text-gray-500">0.0h / 0.0h</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Completed</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{completedTasks} tasks</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{pendingTasks} tasks</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated Hours</span>
              <span className="text-sm font-semibold text-gray-900">{bookingProgress.total_estimated_hours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Actual Hours</span>
              <span className="text-sm font-semibold text-gray-900">{bookingProgress.total_actual_hours.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Efficiency</span>
              <span className="text-sm font-semibold text-red-600">0.0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Progress</h3>
        <div className="space-y-3">
          {weeklyProgress.map((week) => (
            <div key={week.week} className="flex items-center gap-4">
              <div className="w-16 text-sm text-gray-600">Week {week.week}</div>
              <div className="flex-1">
                <Progress value={week.progress} className="h-2" />
              </div>
              <div className="w-12 text-sm font-semibold text-gray-900 text-right">{week.progress}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
