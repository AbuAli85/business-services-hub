'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  CheckCircle, 
  Clock, 
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Target,
  AlertCircle,
  CheckCircle2,
  Play,
  Lock,
  AlertTriangle
} from 'lucide-react'
import { format, isAfter, isBefore } from 'date-fns'
import { useBackendProgress } from '@/hooks/use-backend-progress'
import { toast } from 'sonner'

interface BackendDrivenMilestonesProps {
  bookingId: string
  userRole: 'provider' | 'client' | 'admin'
  className?: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  progress_percentage: number
  due_date?: string
  is_overdue?: boolean
  milestone_id: string
  priority?: 'low' | 'medium' | 'high'
  estimated_hours?: number
  actual_hours?: number
  assigned_to?: string
  created_by?: string
  created_at: string
  updated_at: string
  completed_at?: string
  approval_status?: string
  approved_by?: string
  approved_at?: string
  approval_notes?: string
  overdue_since?: string
  hours_until_due?: number
}

interface Milestone {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  progress_percentage: number
  due_date?: string
  is_overdue?: boolean
  booking_id: string
  priority?: 'low' | 'medium' | 'high'
  weight?: number
  created_by?: string
  created_at: string
  updated_at: string
  completed_at?: string
  overdue_since?: string
  // Calculated fields from backend view
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  pending_tasks: number
  overdue_tasks: number
  total_estimated_hours: number
  total_actual_hours: number
  calculated_status: string
}

export function BackendDrivenMilestones({ 
  bookingId, 
  userRole, 
  className = '' 
}: BackendDrivenMilestonesProps) {
  const [editingTask, setEditingTask] = useState<{milestoneId: string, taskId: string} | null>(null)
  const [newTask, setNewTask] = useState<{milestoneId: string, title: string, description: string} | null>(null)
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)
  const [transitionError, setTransitionError] = useState<string | null>(null)

  const {
    bookingProgress,
    milestones,
    tasks,
    loading,
    error,
    lastUpdated,
    updateTaskProgress,
    canTransition,
    refresh
  } = useBackendProgress({ bookingId })

  // Group tasks by milestone
  const tasksByMilestone = tasks.reduce((acc, task) => {
    if (!acc[task.milestone_id]) {
      acc[task.milestone_id] = []
    }
    acc[task.milestone_id].push(task)
    return acc
  }, {} as Record<string, any[]>)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      setTransitionError(null)
      
      // Get current task to check current status
      const currentTask = tasks.find(t => t.id === taskId)
      if (!currentTask) return

      // Validate transition
      const isValidTransition = await canTransition(currentTask.status, newStatus, 'task')
      if (!isValidTransition) {
        setTransitionError(`Cannot transition from ${currentTask.status} to ${newStatus}`)
        toast.error(`Invalid transition: ${currentTask.status} → ${newStatus}`)
        return
      }

      // Update task status
      await updateTaskProgress(taskId, { status: newStatus })
      toast.success('Task status updated successfully')
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Failed to update task status')
    }
  }

  const handleTaskProgressChange = async (taskId: string, progress: number) => {
    try {
      await updateTaskProgress(taskId, { progress_percentage: progress })
      toast.success('Task progress updated successfully')
    } catch (error) {
      console.error('Error updating task progress:', error)
      toast.error('Failed to update task progress')
    }
  }

  const handleTaskTitleChange = async (taskId: string, title: string) => {
    try {
      await updateTaskProgress(taskId, { title })
      toast.success('Task title updated successfully')
    } catch (error) {
      console.error('Error updating task title:', error)
      toast.error('Failed to update task title')
    }
  }

  const handleTaskDueDateChange = async (taskId: string, dueDate: string) => {
    try {
      await updateTaskProgress(taskId, { due_date: dueDate })
      toast.success('Task due date updated successfully')
    } catch (error) {
      console.error('Error updating task due date:', error)
      toast.error('Failed to update task due date')
    }
  }

  const canStartMilestone = (milestone: any) => {
    // Can start if status is pending and no dependencies
    return milestone.status === 'pending'
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'completed' || status === 'cancelled') return false
    return dueDate && isAfter(new Date(), new Date(dueDate))
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>Error loading progress data: {error}</span>
            </div>
            <Button onClick={refresh} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with booking progress */}
      {bookingProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Project Progress</span>
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated ? format(lastUpdated, 'MMM d, yyyy HH:mm') : 'Never'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-500">
                  {bookingProgress.completed_tasks || 0} of {bookingProgress.total_tasks || 0} tasks completed
                </span>
              </div>
              <Progress value={bookingProgress.booking_progress || 0} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{bookingProgress.booking_progress || 0}% Complete</span>
                <span>
                  {bookingProgress.overdue_tasks || 0} overdue tasks
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transition error display */}
      {transitionError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm">{transitionError}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setTransitionError(null)}
                className="ml-auto"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      <div className="space-y-4">
        {milestones.map((milestone: Milestone) => {
          const milestoneTasks = tasksByMilestone[milestone.id] || []
          const isExpanded = expandedMilestone === milestone.id
          const canStart = canStartMilestone(milestone)
          const isLocked = !canStart && milestone.status === 'pending'

          return (
            <Card key={milestone.id} className={isLocked ? 'opacity-60' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {milestone.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : milestone.status === 'in_progress' ? (
                        <Play className="h-5 w-5 text-blue-600" />
                      ) : isLocked ? (
                        <Lock className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-400" />
                      )}
                      <CardTitle className="text-lg">{milestone.title}</CardTitle>
                    </div>
                    <Badge className={getStatusColor(milestone.status)}>
                      {milestone.status.replace('_', ' ')}
                    </Badge>
                    {milestone.priority && (
                      <Badge className={getPriorityColor(milestone.priority)}>
                        {milestone.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {milestone.completed_tasks || 0}/{milestone.total_tasks || 0} tasks
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </div>
                
                {milestone.description && (
                  <p className="text-sm text-gray-600 mt-2">{milestone.description}</p>
                )}

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-gray-500">
                      {milestone.progress_percentage || 0}%
                    </span>
                  </div>
                  <Progress value={milestone.progress_percentage || 0} className="h-2" />
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-4">
                    {/* Tasks */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Tasks</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNewTask({ milestoneId: milestone.id, title: '', description: '' })}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                      </div>

                      {milestoneTasks.map((task: Task) => (
                        <div key={task.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`task-${task.id}`}
                                checked={task.status === 'completed'}
                                onChange={(e) => handleTaskStatusChange(
                                  task.id, 
                                  e.target.checked ? 'completed' : 'pending'
                                )}
                                className="rounded"
                                aria-label={`Mark task "${task.title}" as ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
                              />
                              <span className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                {task.title}
                              </span>
                              {task.is_overdue && (
                                <Badge variant="destructive" className="text-xs">
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Select
                                value={task.status}
                                onValueChange={(value) => handleTaskStatusChange(task.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                  <SelectItem value="on_hold">On Hold</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {task.description && (
                            <p className="text-sm text-gray-600">{task.description}</p>
                          )}

                          {/* Task progress */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Progress</span>
                              <span className="text-sm text-gray-500">
                                {task.progress_percentage || 0}%
                              </span>
                            </div>
                            <Progress value={task.progress_percentage || 0} className="h-2" />
                          </div>

                          {/* Task details */}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            {task.due_date && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span className={isOverdue(task.due_date, task.status) ? 'text-red-600' : ''}>
                                  Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                                </span>
                              </div>
                            )}
                            {task.estimated_hours && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{task.estimated_hours}h estimated</span>
                              </div>
                            )}
                            {task.actual_hours && task.actual_hours > 0 && (
                              <div className="flex items-center space-x-1">
                                <Target className="h-4 w-4" />
                                <span>{task.actual_hours}h actual</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {milestoneTasks.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No tasks yet. Add your first task to get started.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {milestones.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No milestones found for this booking.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
