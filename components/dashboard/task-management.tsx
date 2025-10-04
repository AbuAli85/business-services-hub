'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause,
  Plus,
  Edit,
  Trash2,
  Timer,
  Calendar,
  User,
  MessageSquare
} from 'lucide-react'
import { Milestone, Task, TimeEntry } from '@/types/progress'
import { formatDistanceToNow, isAfter, isBefore } from 'date-fns'
import { safeFormatDate } from '@/lib/date-utils'
import { toast } from 'sonner'

interface TaskManagementProps {
  milestone: Milestone
  userRole: 'provider' | 'client'
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskCreate: (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
  onStartTimeTracking: (taskId: string, description?: string) => Promise<void>
  onStopTimeTracking: (entryId: string) => Promise<void>
  activeTimeEntry: TimeEntry | null
}

export function TaskManagement({
  milestone,
  userRole,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onStartTimeTracking,
  onStopTimeTracking,
  activeTimeEntry
}: TaskManagementProps) {
  const [showAddTask, setShowAddTask] = useState(false)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    estimated_hours: 0,
    due_date: ''
  })

  const tasks = milestone.tasks || []

  // Handle add task
  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required')
      return
    }

    try {
      await onTaskCreate(milestone.id, {
        milestone_id: milestone.id,
        title: newTask.title.trim(),
        description: newTask.description.trim() || undefined,
        priority: newTask.priority,
        estimated_hours: newTask.estimated_hours,
        due_date: newTask.due_date || undefined,
        status: 'pending',
        progress: 0,
        tags: [],
        order_index: 0,
        assigned_to: undefined
      })

      setNewTask({
        title: '',
        description: '',
        priority: 'normal',
        estimated_hours: 0,
        due_date: ''
      })
      setShowAddTask(false)
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // Handle task status change
  const handleTaskStatusChange = async (taskId: string, status: string) => {
    try {
      await onTaskUpdate(taskId, { 
        status: status as any,
        ...(status === 'completed' && { completed_at: new Date().toISOString() })
      })
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  // Handle task progress change
  const handleTaskProgressChange = async (taskId: string, progress: number) => {
    try {
      await onTaskUpdate(taskId, { progress: progress })
    } catch (error) {
      console.error('Error updating task progress:', error)
    }
  }

  // Handle time tracking
  const handleTimeTracking = async (taskId: string) => {
    const activeEntry = activeTimeEntry
    if (activeEntry && activeEntry.task_id === taskId) {
      // Stop current tracking
      await onStopTimeTracking(activeEntry.id)
    } else {
      // Start new tracking
      await onStartTimeTracking(taskId, `Working on ${tasks.find(t => t.id === taskId)?.title}`)
    }
  }

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Tasks</CardTitle>
          {userRole === 'provider' && (
            <Button
              size="sm"
              onClick={() => setShowAddTask(!showAddTask)}
              className="flex items-center space-x-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add Task</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Task Form */}
        {showAddTask && userRole === 'provider' && (
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Task Title *</label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Enter task title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) => setNewTask({ ...newTask, priority: value as any })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Estimated Hours</label>
                  <Input
                    type="number"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({ ...newTask, estimated_hours: Number(e.target.value) })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Due Date</label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Enter task description"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={handleAddTask} size="sm">
                  Add Task
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddTask(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No tasks yet</p>
            <p className="text-sm text-gray-400">Add tasks to track progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const isOverdue = isTaskOverdue(task)
              const isActive = activeTimeEntry?.task_id === task.id

              return (
                <Card key={task.id} className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(task.priority || 'normal')}>
                            {task.priority || 'normal'}
                          </Badge>
                          {isOverdue && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {task.due_date ? safeFormatDate(task.due_date, 'MMM dd') : 'No due date'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Timer className="h-3 w-3" />
                            <span>{task.estimated_hours || 0}h estimated</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{task.actual_hours || 0}h actual</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">Progress</span>
                            <span className="text-sm text-gray-500">{task.progress || 0}%</span>
                          </div>
                          <Progress value={task.progress || 0} className="h-2" />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {userRole === 'provider' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTimeTracking(task.id)}
                              className={isActive ? 'bg-green-100 text-green-800' : ''}
                            >
                              {isActive ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <Select
                              value={task.status}
                              onValueChange={(value) => handleTaskStatusChange(task.id, value)}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onTaskDelete(task.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* Approval status functionality removed - not available in Task type */}
                      </div>
                    </div>

                    {/* Inline Editing */}
                    {editingTask === task.id && userRole === 'provider' && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Progress %</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={task.progress || 0}
                              onChange={(e) => handleTaskProgressChange(task.id, Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Actual Hours</label>
                            <Input
                              type="number"
                              min="0"
                              value={task.actual_hours || 0}
                              onChange={(e) => onTaskUpdate(task.id, { actual_hours: Number(e.target.value) })}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => setEditingTask(null)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingTask(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
