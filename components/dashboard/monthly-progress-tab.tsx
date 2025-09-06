'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  List,
  Grid
} from 'lucide-react'
import { Milestone, Task } from '@/lib/progress-tracking'
import { startOfMonth, endOfMonth, isWithinInterval, isAfter, isBefore } from 'date-fns'
import { safeFormatDate } from '@/lib/date-utils'

interface MonthlyProgressTabProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskCreate: (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
}

export function MonthlyProgressTab({
  milestones,
  userRole,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onMilestoneUpdate
}: MonthlyProgressTabProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed')
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth)
    const monthEnd = endOfMonth(selectedMonth)

    // Filter milestones and tasks for the selected month
    const monthlyMilestones = milestones.filter(milestone => {
      const milestoneDate = new Date(milestone.created_at)
      return isWithinInterval(milestoneDate, { start: monthStart, end: monthEnd })
    })

    // Get all tasks from milestones
    const allTasks = milestones.flatMap(m => m.tasks || [])

    // Filter tasks for the selected month
    const monthlyTasks = allTasks.filter(task => {
      const taskDate = new Date(task.created_at)
      return isWithinInterval(taskDate, { start: monthStart, end: monthEnd })
    })

    // Calculate statistics
    const completedMilestones = monthlyMilestones.filter(m => m.status === 'completed').length
    const pendingMilestones = monthlyMilestones.filter(m => m.status === 'pending' || m.status === 'in_progress').length
    const overdueMilestones = monthlyMilestones.filter(m => {
      if (!m.due_date || m.status === 'completed' || m.status === 'cancelled') return false
      return isBefore(new Date(m.due_date), new Date())
    }).length

    const completedTasks = monthlyTasks.filter(t => t.status === 'completed').length
    const pendingTasks = monthlyTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
    const overdueTasks = monthlyTasks.filter(t => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false
      return isBefore(new Date(t.due_date), new Date())
    }).length

    // Calculate progress trends
    const totalEstimatedHours = monthlyMilestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
    const totalActualHours = monthlyTasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0)

    return {
      milestones: monthlyMilestones,
      tasks: monthlyTasks,
      stats: {
        completedMilestones,
        pendingMilestones,
        overdueMilestones,
        completedTasks,
        pendingTasks,
        overdueTasks,
        totalEstimatedHours,
        totalActualHours
      }
    }
  }, [milestones, selectedMonth])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'on_hold':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Check if task is overdue
  const isTaskOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false
    }
    return isBefore(new Date(task.due_date), new Date())
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">
            {safeFormatDate(selectedMonth, 'MMMM yyyy')} Progress
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(new Date())}
            >
              Current
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
            >
              Next
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span className="text-sm">View:</span>
            <Switch
              checked={viewMode === 'detailed'}
              onCheckedChange={(checked) => setViewMode(checked ? 'detailed' : 'compact')}
            />
            <Grid className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {monthlyData.stats.completedMilestones}
                </p>
                <p className="text-xs text-gray-500">
                  {monthlyData.stats.completedTasks} tasks
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
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {monthlyData.stats.pendingMilestones}
                </p>
                <p className="text-xs text-gray-500">
                  {monthlyData.stats.pendingTasks} tasks
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {monthlyData.stats.overdueMilestones}
                </p>
                <p className="text-xs text-gray-500">
                  {monthlyData.stats.overdueTasks} tasks
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Tracking Summary */}
      {monthlyData.stats.totalEstimatedHours > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Time Tracking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Estimated Hours</span>
                  <span className="text-sm font-bold text-gray-900">
                    {monthlyData.stats.totalEstimatedHours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Actual Hours</span>
                  <span className="text-sm font-bold text-gray-900">
                    {monthlyData.stats.totalActualHours.toFixed(1)}h
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((monthlyData.stats.totalActualHours / monthlyData.stats.totalEstimatedHours) * 100, 100)}%`
                    }}
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {monthlyData.stats.totalActualHours > monthlyData.stats.totalEstimatedHours ? (
                    <TrendingUp className="h-5 w-5 text-red-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-green-500" />
                  )}
                  <span className="text-lg font-bold">
                    {((monthlyData.stats.totalActualHours / monthlyData.stats.totalEstimatedHours) * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {monthlyData.stats.totalActualHours > monthlyData.stats.totalEstimatedHours 
                    ? 'Over estimated time' 
                    : 'Under estimated time'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Milestones ({monthlyData.milestones.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.milestones.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No milestones for this month</p>
            </div>
          ) : (
            <div className={`space-y-4 ${viewMode === 'compact' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}`}>
              {monthlyData.milestones.map((milestone) => {
                const completedTasks = milestone.tasks?.filter(t => t.status === 'completed').length || 0
                const totalTasks = milestone.tasks?.length || 0
                const overdueTasks = milestone.tasks?.filter(t => isTaskOverdue(t)).length || 0

                return (
                  <Card key={milestone.id} className={`${viewMode === 'compact' ? 'p-4' : 'p-6'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                          <Badge className={getStatusColor(milestone.status)}>
                            {milestone.status.replace('_', ' ')}
                          </Badge>
                          {overdueTasks > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {overdueTasks} overdue
                            </Badge>
                          )}
                        </div>
                        
                        {viewMode === 'detailed' && milestone.description && (
                          <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Progress</span>
                            <span className="text-sm font-medium">{milestone.progress_percentage}%</span>
                          </div>
                          <Progress value={milestone.progress_percentage} className="h-2" />
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{completedTasks}/{totalTasks} tasks completed</span>
                            <span>
                              {milestone.estimated_hours || 0}h estimated
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks List (Detailed View Only) */}
      {viewMode === 'detailed' && monthlyData.tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Tasks ({monthlyData.tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyData.tasks.map((task) => {
                const isOverdue = isTaskOverdue(task)
                const milestone = milestones.find(m => m.tasks?.some(t => t.id === task.id))

                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h5 className="font-medium text-gray-900">{task.title}</h5>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        {isOverdue && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {milestone?.title} • {task.estimated_hours || 0}h estimated
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Progress: {task.progress_percentage}%</span>
                        <span>Actual: {task.actual_hours || 0}h</span>
                        {task.due_date && (
                          <span>
                            Due: {safeFormatDate(task.due_date, 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
