'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Clock, Target, AlertCircle, CheckCircle } from 'lucide-react'
import { ProgressTrackingService, BookingProgress, Milestone } from '@/lib/progress-tracking'

interface EnhancedProgressChartsProps {
  bookingId: string
  milestones: Milestone[]
  bookingProgress: BookingProgress | null
}

export function EnhancedProgressCharts({ bookingId, milestones, bookingProgress }: EnhancedProgressChartsProps) {
  const [chartData, setChartData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChartData()
  }, [milestones, bookingProgress])

  const loadChartData = async () => {
    try {
      setLoading(true)
      
      // Calculate milestone progress data
      const milestoneData = milestones.map(milestone => ({
        name: milestone.title,
        progress: milestone.progress_percentage || 0,
        status: milestone.status,
        dueDate: milestone.due_date,
        isOverdue: milestone.is_overdue,
        weight: milestone.weight || 1,
        estimatedHours: milestone.estimated_hours || 0,
        actualHours: milestone.actual_hours || 0
      }))

      // Calculate task distribution
      const taskDistribution = milestones.reduce((acc, milestone) => {
        if (milestone.tasks) {
          milestone.tasks.forEach(task => {
            const status = task.status || 'pending'
            acc[status] = (acc[status] || 0) + 1
          })
        }
        return acc
      }, {} as Record<string, number>)

      // Calculate time tracking data
      const timeData = milestones.reduce((acc, milestone) => {
        if (milestone.tasks) {
          milestone.tasks.forEach(task => {
            acc.estimated += task.estimated_hours || 0
            acc.actual += task.actual_hours || 0
          })
        }
        return acc
      }, { estimated: 0, actual: 0 })

      // Calculate weekly progress (mock data for now)
      const weeklyProgress = [
        { week: 'Week 1', progress: 0 },
        { week: 'Week 2', progress: 15 },
        { week: 'Week 3', progress: 35 },
        { week: 'Week 4', progress: 60 },
        { week: 'Week 5', progress: 80 },
        { week: 'Week 6', progress: 95 }
      ]

      setChartData({
        milestoneData,
        taskDistribution,
        timeData,
        weeklyProgress
      })
    } catch (error) {
      console.error('Error loading chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {bookingProgress?.booking_progress || 0}%
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${bookingProgress?.booking_progress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-2xl font-bold text-green-600">
                {bookingProgress?.completed_tasks || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            of {bookingProgress?.total_tasks || 0} total
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hours Logged</p>
              <p className="text-2xl font-bold text-purple-600">
                {chartData?.timeData.actual.toFixed(1) || 0}h
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            of {chartData?.timeData.estimated.toFixed(1) || 0}h estimated
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue Items</p>
              <p className="text-2xl font-bold text-red-600">
                {bookingProgress?.overdue_tasks || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            needs attention
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestone Progress Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Milestone Progress</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {chartData?.milestoneData.map((milestone: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {milestone.name}
                  </span>
                  <span className="text-sm text-gray-500">{milestone.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      milestone.isOverdue ? 'bg-red-500' : 
                      milestone.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${milestone.progress}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{milestone.status}</span>
                  <span>{milestone.actualHours.toFixed(1)}h / {milestone.estimatedHours.toFixed(1)}h</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Distribution Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Task Distribution</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {Object.entries(chartData?.taskDistribution || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    status === 'completed' ? 'bg-green-500' :
                    status === 'in_progress' ? 'bg-blue-500' :
                    status === 'pending' ? 'bg-yellow-500' :
                    status === 'cancelled' ? 'bg-gray-500' : 'bg-orange-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Time Tracking Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Time Tracking</h3>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Estimated Hours</span>
              <span className="text-sm text-gray-500">{chartData?.timeData.estimated.toFixed(1)}h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (chartData?.timeData.actual / chartData?.timeData.estimated) * 100 || 0)}%` 
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Actual Hours</span>
              <span className="text-sm text-gray-500">{chartData?.timeData.actual.toFixed(1)}h</span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Efficiency</span>
                <span className={`font-medium ${
                  (chartData?.timeData.actual / chartData?.timeData.estimated) <= 1 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {((chartData?.timeData.estimated / chartData?.timeData.actual) * 100 || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Progress Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Weekly Progress</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {chartData?.weeklyProgress.map((week: any, index: number) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{week.week}</span>
                  <span className="text-sm text-gray-500">{week.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${week.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
