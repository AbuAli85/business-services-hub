'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle, 
  Clock, 
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Repeat,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { format, addMonths, isAfter, isBefore } from 'date-fns'

interface SimpleTask {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  isRecurring?: boolean
  recurringType?: 'monthly' | 'weekly' | 'daily'
  priority?: 'low' | 'medium' | 'high'
  estimatedHours?: number
  actualHours?: number
}

interface SimpleMilestone {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  status: 'not_started' | 'in_progress' | 'completed'
  tasks: SimpleTask[]
  color: string
}

interface SimpleMilestonesProps {
  milestones: SimpleMilestone[]
  onMilestoneUpdate: (milestoneId: string, updates: Partial<SimpleMilestone>) => void
  onTaskUpdate: (taskId: string, updates: Partial<SimpleTask>) => void
  onTaskAdd: (milestoneId: string, taskData: Omit<SimpleTask, 'id'>) => void
  onTaskDelete: (milestoneId: string, taskId: string) => void
  userRole: 'provider' | 'client'
}

export function SimpleMilestones({
  milestones,
  onMilestoneUpdate,
  onTaskUpdate,
  onTaskAdd: onTaskCreate,
  onTaskDelete,
  userRole
}: SimpleMilestonesProps) {
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<{milestoneId: string, taskId: string} | null>(null)
  const [newTask, setNewTask] = useState<{milestoneId: string, task: Omit<SimpleTask, 'id'>} | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSmartIndicator = (milestone: SimpleMilestone) => {
    const now = new Date()
    const startDate = new Date(milestone.startDate)
    const endDate = new Date(milestone.endDate)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const progress = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100)
    
    const completedTasks = milestone.tasks.filter(t => t.completed).length
    const totalTasks = milestone.tasks.length
    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Smart indicators
    if (milestone.status === 'completed') return { type: 'success', message: 'Completed! 🎉', color: 'text-green-600' }
    if (isAfter(now, endDate) && (milestone.status === 'not_started' || milestone.status === 'in_progress')) return { type: 'overdue', message: 'Overdue! ⚠️', color: 'text-red-600' }
    if (taskProgress > progress + 20) return { type: 'ahead', message: 'Ahead of schedule! 🚀', color: 'text-green-600' }
    if (taskProgress < progress - 20) return { type: 'behind', message: 'Behind schedule! 📈', color: 'text-orange-600' }
    if (taskProgress > 80) return { type: 'almost', message: 'Almost done! 💪', color: 'text-blue-600' }
    
    return { type: 'on_track', message: 'On track! ✅', color: 'text-blue-600' }
  }

  const handleTaskToggle = (milestoneId: string, taskId: string) => {
    const milestone = milestones.find(m => m.id === milestoneId)
    if (!milestone) return

    const task = milestone.tasks.find(t => t.id === taskId)
    if (!task) return

    onTaskUpdate(taskId, { completed: !task.completed })
  }

  const handleAddTask = (milestoneId: string) => {
    const task: Omit<SimpleTask, 'id'> = {
      title: '',
      completed: false,
      priority: 'medium',
      estimatedHours: 1
    }
    setNewTask({ milestoneId, task })
  }

  const saveNewTask = () => {
    if (!newTask) return
    onTaskCreate(newTask.milestoneId, { ...newTask.task })
    setNewTask(null)
  }

  const handleRecurringTask = (milestoneId: string, task: SimpleTask) => {
    if (task.isRecurring && task.recurringType === 'monthly') {
      const nextDueDate = addMonths(new Date(task.dueDate || new Date()), 1)
      const newTask: Omit<SimpleTask, 'id'> = {
        ...task,
        dueDate: format(nextDueDate, 'yyyy-MM-dd'),
        completed: false
      }
      onTaskCreate(milestoneId, { ...newTask })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Simple Milestones</h2>
          <p className="text-gray-600">Easy task management with smart progress tracking</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {milestones.filter(m => m.status === 'completed').length} of {milestones.length} completed
          </Badge>
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        {milestones.map((milestone) => {
          const smartIndicator = getSmartIndicator(milestone)
          const completedTasks = milestone.tasks.filter(t => t.completed).length
          const totalTasks = milestone.tasks.length
          const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

          return (
            <Card key={milestone.id} className="border-l-4" style={{ borderLeftColor: milestone.color }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(milestone.status)}`}>
                      {milestone.status.replace('_', ' ')}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{milestone.title}</CardTitle>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`text-sm font-medium ${smartIndicator.color}`}>
                      {smartIndicator.message}
                    </div>
                    {userRole === 'provider' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingMilestone(editingMilestone === milestone.id ? null : milestone.id)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progress</span>
                    <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <span>{completedTasks} of {totalTasks} tasks completed</span>
                    <span>{format(new Date(milestone.startDate), 'MMM dd')} - {format(new Date(milestone.endDate), 'MMM dd, yyyy')}</span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-2">
                  {milestone.tasks.map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <button
                        onClick={() => handleTaskToggle(milestone.id, task.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          task.completed 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {task.completed && <CheckCircle2 className="h-3 w-3" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </span>
                          {task.priority && (
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          )}
                          {task.isRecurring && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                              <Repeat className="h-3 w-3 mr-1" />
                              {task.recurringType}
                            </Badge>
                          )}
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {task.isRecurring && task.completed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRecurringTask(milestone.id, task)}
                            className="text-xs"
                          >
                            <Repeat className="h-3 w-3 mr-1" />
                            Repeat
                          </Button>
                        )}
                        {userRole === 'provider' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingTask({milestoneId: milestone.id, taskId: task.id})}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                        {userRole === 'provider' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onTaskDelete(milestone.id, task.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Task Button */}
                  {userRole === 'provider' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTask(milestone.id)}
                      className="w-full mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  )}
                </div>

                {/* New Task Form */}
                {newTask && newTask.milestoneId === milestone.id && (
                  <Card className="mt-4 border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3">Add New Task</h4>
                      <div className="space-y-3">
                        <Input
                          placeholder="Task title"
                          value={newTask.task.title}
                          onChange={(e) => setNewTask({
                            ...newTask,
                            task: { ...newTask.task, title: e.target.value }
                          })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            placeholder="Due date"
                            value={newTask.task.dueDate || ''}
                            onChange={(e) => setNewTask({
                              ...newTask,
                              task: { ...newTask.task, dueDate: e.target.value }
                            })}
                          />
                          <select
                            value={newTask.task.priority || 'medium'}
                            onChange={(e) => setNewTask({
                              ...newTask,
                              task: { ...newTask.task, priority: e.target.value as 'low' | 'medium' | 'high' }
                            })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                          </select>
                        </div>
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={newTask.task.isRecurring || false}
                              onChange={(e) => setNewTask({
                                ...newTask,
                                task: { ...newTask.task, isRecurring: e.target.checked }
                              })}
                            />
                            <span className="text-sm">Recurring</span>
                          </label>
                          {newTask.task.isRecurring && (
                            <select
                              value={newTask.task.recurringType || 'monthly'}
                              onChange={(e) => setNewTask({
                                ...newTask,
                                task: { ...newTask.task, recurringType: e.target.value as 'monthly' | 'weekly' | 'daily' }
                              })}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button onClick={saveNewTask} size="sm">Add Task</Button>
                          <Button variant="outline" onClick={() => setNewTask(null)} size="sm">Cancel</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
