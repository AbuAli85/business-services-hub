'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target,
  CheckCircle,
  AlertTriangle,
  Timer,
  Activity
} from 'lucide-react'
import { Milestone, TimeEntry } from '@/lib/progress-tracking'
import { startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns'
import { safeFormatDate } from '@/lib/date-utils'

interface AnalyticsViewProps {
  milestones: Milestone[]
  timeEntries: TimeEntry[]
  totalEstimatedHours: number
  totalActualHours: number
}

export function AnalyticsView({
  milestones,
  timeEntries,
  totalEstimatedHours,
  totalActualHours
}: AnalyticsViewProps) {
  // Calculate analytics data
  const analyticsData = useMemo(() => {
    // Task distribution
    const allTasks = milestones.flatMap(m => m.tasks || [])
    const completedTasks = allTasks.filter(t => t.status === 'completed').length
    const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
    const overdueTasks = allTasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false
      return new Date(t.due_date) < new Date()
    }).length

    // Milestone distribution
    const completedMilestones = milestones.filter(m => m.status === 'completed').length
    const pendingMilestones = milestones.filter(m => m.status === 'pending' || m.status === 'in_progress').length
    const overdueMilestones = milestones.filter(m => {
      if (!m.due_date || m.status === 'completed' || m.status === 'cancelled') return false
      return new Date(m.due_date) < new Date()
    }).length

    // Efficiency calculation
    const efficiency = totalEstimatedHours > 0 ? (totalActualHours / totalEstimatedHours) * 100 : 0
    const efficiencyStatus = efficiency > 100 ? 'over' : efficiency < 80 ? 'under' : 'on_track'

    // Weekly progress data
    const weeklyData = (() => {
      const weeks = []
      const now = new Date()
      
      // Get last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000))
        const weekEnd = endOfWeek(weekStart)
        
        const weekMilestones = milestones.filter(m => 
          isWithinInterval(new Date(m.created_at), { start: weekStart, end: weekEnd })
        )
        
        const weekTasks = allTasks.filter(t => 
          isWithinInterval(new Date(t.created_at), { start: weekStart, end: weekEnd })
        )
        
        const weekCompletedTasks = weekTasks.filter(t => t.status === 'completed').length
        const weekProgress = weekTasks.length > 0 ? (weekCompletedTasks / weekTasks.length) * 100 : 0
        
        weeks.push({
          week: safeFormatDate(weekStart, 'MMM dd'),
          milestones: weekMilestones.length,
          tasks: weekTasks.length,
          completedTasks: weekCompletedTasks,
          progress: weekProgress
        })
      }
      
      return weeks
    })()

    // Time tracking trends
    const timeTrackingData = (() => {
      const dailyHours = new Map<string, number>()
      
      timeEntries.forEach(entry => {
        if (entry.duration_minutes) {
          const date = safeFormatDate(entry.created_at, 'yyyy-MM-dd')
          const hours = entry.duration_minutes / 60
          dailyHours.set(date, (dailyHours.get(date) || 0) + hours)
        }
      })
      
      return Array.from(dailyHours.entries())
        .map(([date, hours]) => ({ date, hours }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7) // Last 7 days
    })()

    return {
      taskDistribution: {
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        total: allTasks.length
      },
      milestoneDistribution: {
        completed: completedMilestones,
        pending: pendingMilestones,
        overdue: overdueMilestones,
        total: milestones.length
      },
      efficiency: {
        percentage: efficiency,
        status: efficiencyStatus,
        estimated: totalEstimatedHours,
        actual: totalActualHours
      },
      weeklyProgress: weeklyData,
      timeTracking: timeTrackingData
    }
  }, [milestones, timeEntries, totalEstimatedHours, totalActualHours])

  // Donut chart data for task distribution
  const taskDistributionData = [
    { label: 'Completed', value: analyticsData.taskDistribution.completed, color: 'bg-green-500' },
    { label: 'Pending', value: analyticsData.taskDistribution.pending, color: 'bg-yellow-500' },
    { label: 'Overdue', value: analyticsData.taskDistribution.overdue, color: 'bg-red-500' }
  ].filter(item => item.value > 0)

  const totalTasks = analyticsData.taskDistribution.total
  const taskDistributionPercentage = taskDistributionData.map(item => ({
    ...item,
    percentage: totalTasks > 0 ? (item.value / totalTasks) * 100 : 0
  }))

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData.efficiency.percentage.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">
                  {analyticsData.efficiency.status === 'over' ? 'Over estimated' : 
                   analyticsData.efficiency.status === 'under' ? 'Under estimated' : 'On track'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                {analyticsData.efficiency.status === 'over' ? (
                  <TrendingUp className="h-6 w-6 text-red-500" />
                ) : analyticsData.efficiency.status === 'under' ? (
                  <TrendingDown className="h-6 w-6 text-green-500" />
                ) : (
                  <Target className="h-6 w-6 text-blue-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {analyticsData.taskDistribution.completed}
                </p>
                <p className="text-xs text-gray-500">
                  of {totalTasks} total
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hours Logged</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsData.efficiency.actual.toFixed(1)}h
                </p>
                <p className="text-xs text-gray-500">
                  of {analyticsData.efficiency.estimated.toFixed(1)}h estimated
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Timer className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Items</p>
                <p className="text-2xl font-bold text-red-600">
                  {analyticsData.taskDistribution.overdue + analyticsData.milestoneDistribution.overdue}
                </p>
                <p className="text-xs text-gray-500">
                  {analyticsData.taskDistribution.overdue} tasks, {analyticsData.milestoneDistribution.overdue} milestones
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Distribution Donut Chart */}
      {taskDistributionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Task Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                {/* Donut Chart */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {taskDistributionPercentage.map((item, index) => {
                    const startAngle = taskDistributionPercentage
                      .slice(0, index)
                      .reduce((sum, prev) => sum + prev.percentage, 0)
                    const endAngle = startAngle + item.percentage
                    const radius = 40
                    const circumference = 2 * Math.PI * radius
                    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`
                    const strokeDashoffset = -startAngle * circumference / 100

                    return (
                      <circle
                        key={item.label}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={item.color.replace('bg-', '').replace('-500', '')}
                        strokeWidth="8"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300"
                      />
                    )
                  })}
                </svg>
                
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
                    <div className="text-sm text-gray-500">Total Tasks</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex justify-center mt-6">
              <div className="flex space-x-6">
                {taskDistributionPercentage.map((item) => (
                  <div key={item.label} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                    <span className="text-sm text-gray-600">
                      {item.label} ({item.value})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Weekly Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.weeklyProgress.map((week, index) => (
              <div key={week.week} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{week.week}</span>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{week.completedTasks}/{week.tasks} tasks</span>
                    <span>{week.milestones} milestones</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${week.progress}%` }}
                  />
                </div>
                <div className="text-right text-xs text-gray-500">
                  {week.progress.toFixed(0)}% completion
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking Trends */}
      {analyticsData.timeTracking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Time Tracking Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.timeTracking.map((day, index) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {safeFormatDate(day.date, 'MMM dd')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((day.hours / 8) * 100, 100)}%` // Assuming 8h max per day
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {day.hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Efficiency Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Efficiency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Time Estimation Accuracy</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Estimated Hours</span>
                  <span className="text-sm font-medium">{analyticsData.efficiency.estimated.toFixed(1)}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Actual Hours</span>
                  <span className="text-sm font-medium">{analyticsData.efficiency.actual.toFixed(1)}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Variance</span>
                  <span className={`text-sm font-medium ${
                    analyticsData.efficiency.status === 'over' ? 'text-red-600' : 
                    analyticsData.efficiency.status === 'under' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {analyticsData.efficiency.actual > analyticsData.efficiency.estimated ? '+' : ''}
                    {(analyticsData.efficiency.actual - analyticsData.efficiency.estimated).toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
              <div className="space-y-2">
                {analyticsData.efficiency.status === 'over' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Over Estimation:</strong> Consider breaking down tasks into smaller chunks or adjusting timelines.
                    </p>
                  </div>
                )}
                {analyticsData.efficiency.status === 'under' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Under Estimation:</strong> Great job! Consider adding more features or improving quality.
                    </p>
                  </div>
                )}
                {analyticsData.efficiency.status === 'on_track' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>On Track:</strong> Excellent estimation accuracy! Keep up the good work.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}