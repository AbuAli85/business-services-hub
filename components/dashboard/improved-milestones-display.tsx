'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause,
  Calendar,
  Timer,
  Target,
  ChevronRight,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { Milestone, Task, TimeEntry } from '@/lib/progress-tracking'
import { isAfter, isBefore } from 'date-fns'
import { safeFormatDate, safeFormatDistanceToNow } from '@/lib/date-utils'

interface ImprovedMilestonesDisplayProps {
  milestones: Milestone[]
  userRole: 'provider' | 'client'
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskCreate: (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
  onStartTimeTracking: (taskId: string, description?: string) => Promise<void>
  onStopTimeTracking: (entryId: string) => Promise<void>
  timeEntries: TimeEntry[]
}

export function ImprovedMilestonesDisplay({
  milestones,
  userRole,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onMilestoneUpdate,
  onStartTimeTracking,
  onStopTimeTracking,
  timeEntries
}: ImprovedMilestonesDisplayProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)

  // Auto-expand the first incomplete milestone
  useEffect(() => {
    const firstIncomplete = milestones.find(m => m.status !== 'completed' && m.status !== 'cancelled')
    if (firstIncomplete) {
      setExpandedMilestone(firstIncomplete.id)
    }
  }, [milestones])

  const getPhaseColor = (index: number) => {
    const colors = [
      { name: 'Planning', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      { name: 'Development', color: 'bg-green-100 text-green-800 border-green-200' },
      { name: 'Testing', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      { name: 'Deployment', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      { name: 'Maintenance', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    ]
    return colors[index % colors.length]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const isOverdue = (milestone: Milestone) => {
    if (!milestone.due_date || milestone.status === 'completed') return false
    return isBefore(new Date(milestone.due_date), new Date())
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600'
    if (progress >= 60) return 'text-blue-600'
    if (progress >= 40) return 'text-yellow-600'
    if (progress >= 20) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressBarColor = (progress: number) => {
    if (progress >= 80) return '[&>div]:bg-green-500'
    if (progress >= 60) return '[&>div]:bg-blue-500'
    if (progress >= 40) return '[&>div]:bg-yellow-500'
    if (progress >= 20) return '[&>div]:bg-orange-500'
    return '[&>div]:bg-red-500'
  }

  if (milestones.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No milestones found</p>
            <p className="text-sm text-gray-400">Milestones will appear here once created</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Phases</h2>
          <p className="text-gray-600">Track your project milestones and tasks</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {milestones.filter(m => m.status === 'completed').length} of {milestones.length} completed
          </Badge>
        </div>
      </div>

      {/* Milestones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {milestones.map((milestone, index) => {
          const phase = getPhaseColor(index)
          const overdue = isOverdue(milestone)
          const completedTasks = milestone.tasks?.filter(t => t.status === 'completed').length || 0
          const totalTasks = milestone.tasks?.length || 0
          const isExpanded = expandedMilestone === milestone.id

          return (
            <Card 
              key={milestone.id} 
              className={`transition-all duration-300 hover:shadow-lg ${
                isExpanded ? 'ring-2 ring-blue-500 shadow-lg' : ''
              } ${overdue ? 'border-red-200 bg-red-50' : ''}`}
            >
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${phase.color}`}>
                      Phase {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {milestone.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={milestone.status === 'completed' ? 'default' : 
                              milestone.status === 'in_progress' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {milestone.status.replace('_', ' ')}
                    </Badge>
                    {overdue && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className={`text-sm font-bold ${getProgressColor(milestone.progress_percentage)}`}>
                      {milestone.progress_percentage}%
                    </span>
                  </div>
                  <Progress 
                    value={milestone.progress_percentage} 
                    className={`h-3 mb-2 ${getProgressBarColor(milestone.progress_percentage)}`}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{completedTasks} of {totalTasks} tasks completed</span>
                    {milestone.due_date && (
                      <span>
                        Due: {safeFormatDate(milestone.due_date, 'MMM dd, yyyy')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                      className="text-xs"
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                      <ChevronRight className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </Button>
                    
                    {userRole === 'provider' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onMilestoneUpdate(milestone.id, { 
                          status: milestone.status === 'in_progress' ? 'completed' : 'in_progress' 
                        })}
                        className="text-xs"
                      >
                        {milestone.status === 'in_progress' ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Last updated: {safeFormatDistanceToNow(milestone.updated_at)}
                    </p>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="space-y-4">
                      {/* Tasks Section */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                          <Target className="h-4 w-4 mr-2" />
                          Tasks ({completedTasks}/{totalTasks})
                        </h4>
                        {milestone.tasks && milestone.tasks.length > 0 ? (
                          <div className="space-y-2">
                            {milestone.tasks.map((task) => (
                              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-2 h-2 rounded-full ${
                                    task.status === 'completed' ? 'bg-green-500' : 
                                    task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                                  }`} />
                                  <span className={`text-sm ${
                                    task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                                  }`}>
                                    {task.title}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {task.status.replace('_', ' ')}
                                  </Badge>
                                  {task.estimated_hours && (
                                    <span className="text-xs text-gray-500">
                                      {task.estimated_hours}h
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No tasks assigned to this milestone</p>
                        )}
                      </div>

                      {/* Time Tracking */}
                      {milestone.estimated_hours && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                            <Timer className="h-4 w-4 mr-2" />
                            Time Tracking
                          </h4>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">Estimated Hours</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {milestone.estimated_hours}h
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {milestones.filter(m => m.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Play className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {milestones.filter(m => m.status === 'in_progress').length}
              </p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {milestones.filter(m => m.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(milestones.reduce((acc, m) => acc + m.progress_percentage, 0) / milestones.length)}%
              </p>
              <p className="text-sm text-gray-600">Avg Progress</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
