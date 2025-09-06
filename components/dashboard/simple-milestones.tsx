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
  purpose?: string
  mainGoal?: string
  startDate: string
  endDate: string
  status: 'pending' | 'in_progress' | 'completed'
  tasks: SimpleTask[]
  color: string
  phaseNumber: 1 | 2 | 3 | 4  // Only 4 phases allowed
  estimatedHours?: number
  actualHours?: number
  clientComments?: Comment[]
  isRecurring?: boolean  // NEW: Monthly recurring project
  projectType?: 'one_time' | 'monthly'  // NEW: Project type
}

interface Comment {
  id: string
  text: string
  author: string
  authorRole: 'provider' | 'client'
  createdAt: string
}

interface SimpleMilestonesProps {
  milestones: SimpleMilestone[]
  onMilestoneUpdate: (milestoneId: string, updates: Partial<SimpleMilestone>) => void
  onTaskUpdate: (taskId: string, updates: Partial<SimpleTask>) => void
  onTaskAdd: (milestoneId: string, taskData: Omit<SimpleTask, 'id'>) => void
  onTaskDelete: (milestoneId: string, taskId: string) => void
  onCommentAdd: (milestoneId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void
  onProjectTypeChange: (projectType: 'one_time' | 'monthly') => void
  userRole: 'provider' | 'client'
}

export function SimpleMilestones({
  milestones,
  onMilestoneUpdate,
  onTaskUpdate,
  onTaskAdd: onTaskCreate,
  onTaskDelete,
  onCommentAdd,
  onProjectTypeChange,
  userRole
}: SimpleMilestonesProps) {
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<{milestoneId: string, taskId: string} | null>(null)
  const [newTask, setNewTask] = useState<{milestoneId: string, task: Omit<SimpleTask, 'id'>} | null>(null)
  const [newComment, setNewComment] = useState<{milestoneId: string, text: string} | null>(null)
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)
  const [projectType, setProjectType] = useState<'one_time' | 'monthly'>('one_time')
  const [editingMilestoneData, setEditingMilestoneData] = useState<Partial<SimpleMilestone> | null>(null)

  // Standard 4 phases - never more, never less
  const standardPhases = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001', // Planning & Setup UUID
      title: 'Planning & Setup',
      description: 'Initial planning, requirements gathering, and project setup',
      purpose: 'Establish project foundation and clear requirements',
      mainGoal: 'Complete project planning and setup phase',
      phaseNumber: 1 as const,
      color: '#3B82F6'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002', // Development UUID
      title: 'Development',
      description: 'Core development work and implementation',
      purpose: 'Build and implement the main project features',
      mainGoal: 'Complete all development tasks and features',
      phaseNumber: 2 as const,
      color: '#10B981'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003', // Testing & Quality UUID
      title: 'Testing & Quality',
      description: 'Testing, quality assurance, and bug fixes',
      purpose: 'Ensure quality and fix any issues',
      mainGoal: 'Complete testing and quality assurance',
      phaseNumber: 3 as const,
      color: '#F59E0B'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004', // Delivery & Launch UUID
      title: 'Delivery & Launch',
      description: 'Final delivery, deployment, and project launch',
      purpose: 'Deliver completed project to client',
      mainGoal: 'Successfully deliver and launch the project',
      phaseNumber: 4 as const,
      color: '#8B5CF6'
    }
  ]

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
    if (isAfter(now, endDate) && (milestone.status === 'pending' || milestone.status === 'in_progress')) return { type: 'overdue', message: 'Overdue! ⚠️', color: 'text-red-600' }
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

  const handleAddComment = (milestoneId: string) => {
    setNewComment({ milestoneId, text: '' })
  }

  const saveComment = () => {
    if (!newComment || !newComment.text.trim()) return
    
    onCommentAdd(newComment.milestoneId, {
      text: newComment.text,
      author: userRole === 'provider' ? 'Provider' : 'Client',
      authorRole: userRole
    })
    setNewComment(null)
  }

  const handleMonthlyReset = () => {
    if (projectType === 'monthly' && userRole === 'provider') {
      // Reset all phases to not_started for next month
      standardPhases.forEach(phase => {
        onMilestoneUpdate(phase.id, {
          status: 'pending',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          tasks: [],
          estimatedHours: 0,
          actualHours: 0
        })
      })
    }
  }

  const handleStartEdit = (milestone: SimpleMilestone) => {
    setEditingMilestone(milestone.id)
    setEditingMilestoneData({
      title: milestone.title,
      description: milestone.description,
      purpose: milestone.purpose,
      mainGoal: milestone.mainGoal,
      startDate: milestone.startDate,
      endDate: milestone.endDate,
      estimatedHours: milestone.estimatedHours,
      status: milestone.status
    })
  }

  const handleSaveEdit = () => {
    if (editingMilestone && editingMilestoneData) {
      onMilestoneUpdate(editingMilestone, editingMilestoneData)
      setEditingMilestone(null)
      setEditingMilestoneData(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingMilestone(null)
    setEditingMilestoneData(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Project Phases</h2>
              <p className="text-gray-600 text-lg">4-phase project management system</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Project Type Selection */}
            <div className="flex items-center space-x-3 bg-white rounded-lg p-3 shadow-sm border">
              <span className="text-sm font-semibold text-gray-700">Project Type:</span>
              <select
                value={projectType}
                onChange={(e) => {
                  const newType = e.target.value as 'one_time' | 'monthly'
                  setProjectType(newType)
                  onProjectTypeChange(newType)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="one_time">One Time Project</option>
                <option value="monthly">Monthly Recurring</option>
              </select>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
              <Badge variant="outline" className="text-sm font-semibold">
                {milestones.filter(m => m.status === 'completed').length} of 4 completed
              </Badge>
            </div>
            {projectType === 'monthly' && userRole === 'provider' && (
              <Button
                onClick={handleMonthlyReset}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Reset for Next Month
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Project Type Info */}
      <div className={`rounded-xl p-6 border-2 transition-all duration-300 ${
        projectType === 'monthly' 
          ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' 
          : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
      }`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              projectType === 'monthly' 
                ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                : 'bg-gradient-to-br from-green-500 to-emerald-500'
            }`}>
              {projectType === 'monthly' ? (
                <Repeat className="h-6 w-6 text-white" />
              ) : (
                <Target className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold mb-2 ${
              projectType === 'monthly' ? 'text-purple-900' : 'text-green-900'
            }`}>
              {projectType === 'monthly' ? 'Monthly Recurring Project' : 'One Time Project'}
            </h3>
            <p className={`text-sm font-medium ${
              projectType === 'monthly' ? 'text-purple-700' : 'text-green-700'
            }`}>
              {projectType === 'monthly' 
                ? 'This project will repeat monthly with the same 4 phases. Perfect for ongoing services, maintenance, or regular deliverables.'
                : 'This is a one-time project with 4 phases. Once completed, the project is finished.'
              }
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                projectType === 'monthly' ? 'bg-purple-500' : 'bg-green-500'
              }`}></div>
              <span className={`text-xs font-semibold ${
                projectType === 'monthly' ? 'text-purple-600' : 'text-green-600'
              }`}>
                {projectType === 'monthly' ? 'Recurring every month' : 'Single completion'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones - Always exactly 4 phases */}
      <div className="space-y-4">
        {standardPhases.map((phaseTemplate) => {
          // Find existing milestone or create from template
          const milestone = milestones.find(m => m.phaseNumber === phaseTemplate.phaseNumber) || {
            ...phaseTemplate,
            id: phaseTemplate.id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending' as const,
            tasks: [],
            estimatedHours: 0,
            actualHours: 0,
            clientComments: [],
            isRecurring: projectType === 'monthly',
            projectType: projectType
          }
          const smartIndicator = getSmartIndicator(milestone)
          const completedTasks = milestone.tasks.filter(t => t.completed).length
          const totalTasks = milestone.tasks.length
          const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

          return (
            <Card key={milestone.id} className={`border-l-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${
              milestone.status === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
              milestone.status === 'in_progress' ? 'bg-gradient-to-r from-blue-50 to-indigo-50' :
              'bg-gradient-to-r from-gray-50 to-slate-50'
            }`} style={{ borderLeftColor: milestone.color }}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center shadow-lg ${
                      milestone.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                      milestone.status === 'in_progress' ? 'bg-gradient-to-br from-blue-500 to-indigo-500' :
                      'bg-gradient-to-br from-gray-400 to-slate-400'
                    }`}>
                      <span className="text-white font-bold text-lg">{milestone.phaseNumber}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-xl font-bold text-gray-900">{milestone.title}</CardTitle>
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold border-2 ${getStatusColor(milestone.status)}`}>
                          {milestone.status.replace('_', ' ').toUpperCase()}
                        </div>
                        {milestone.isRecurring && (
                          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                            <Repeat className="h-3 w-3 mr-1" />
                            Monthly
                          </Badge>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 mb-2 font-medium">{milestone.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {milestone.purpose && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-semibold text-blue-700">Purpose: {milestone.purpose}</span>
                          </div>
                        )}
                        {milestone.mainGoal && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs font-semibold text-green-700">Goal: {milestone.mainGoal}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className={`text-sm font-bold px-3 py-1 rounded-full ${smartIndicator.color} bg-white shadow-sm`}>
                      {smartIndicator.message}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedMilestone(expandedMilestone === milestone.id ? null : milestone.id)}
                      className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                    >
                      {expandedMilestone === milestone.id ? 'Collapse' : 'Expand'}
                    </Button>
                    {userRole === 'provider' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(milestone)}
                        className="hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-700">Progress</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-gray-900">{Math.round(progress)}%</span>
                      <div className={`w-3 h-3 rounded-full ${
                        progress >= 80 ? 'bg-green-500' :
                        progress >= 60 ? 'bg-blue-500' :
                        progress >= 40 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}></div>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={progress} 
                      className="h-3 shadow-inner"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-white drop-shadow-lg">
                        {Math.round(progress)}% Complete
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mt-3 font-semibold">
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{completedTasks} of {totalTasks} tasks completed</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>{format(new Date(milestone.startDate), 'MMM dd')} - {format(new Date(milestone.endDate), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Tasks ({totalTasks})</span>
                  </h4>
                  {milestone.tasks.map((task) => (
                    <div key={task.id} className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                      task.completed 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                        : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 hover:border-blue-300'
                    }`}>
                      <button
                        onClick={() => handleTaskToggle(milestone.id, task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          task.completed 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 border-green-500 text-white shadow-lg' 
                            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                        }`}
                      >
                        {task.completed && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`text-sm font-semibold ${
                            task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}>
                            {task.title}
                          </span>
                          {task.priority && (
                            <Badge variant="outline" className={`text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                              {task.priority.toUpperCase()}
                            </Badge>
                          )}
                          {task.isRecurring && (
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200 font-semibold">
                              <Repeat className="h-3 w-3 mr-1" />
                              {task.recurringType?.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span className="font-medium">Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {task.isRecurring && task.completed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRecurringTask(milestone.id, task)}
                            className="text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-all duration-200"
                          >
                            <Repeat className="h-3 w-3 mr-1" />
                            Repeat
                          </Button>
                        )}
                        {userRole === 'provider' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTask({milestoneId: milestone.id, taskId: task.id})}
                            className="hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                        {userRole === 'provider' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onTaskDelete(milestone.id, task.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-all duration-200"
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
                      className="w-full mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 transition-all duration-200 font-semibold"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Task
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
                            value={newTask.task.dueDate ? format(new Date(newTask.task.dueDate), 'yyyy-MM-dd') : ''}
                            onChange={(e) => setNewTask({
                              ...newTask,
                              task: { ...newTask.task, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }
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

                {/* Expanded View - Tasks, Comments, and Details */}
                {expandedMilestone === milestone.id && (
                  <div className="mt-6 space-y-4">
                    {/* Milestone Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Phase Details</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Start Date:</strong> {format(new Date(milestone.startDate), 'MMM dd, yyyy')}</div>
                          <div><strong>End Date:</strong> {format(new Date(milestone.endDate), 'MMM dd, yyyy')}</div>
                          <div><strong>Estimated Hours:</strong> {milestone.estimatedHours || 0}h</div>
                          <div><strong>Actual Hours:</strong> {milestone.actualHours || 0}h</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Progress Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div><strong>Tasks Completed:</strong> {completedTasks} of {totalTasks}</div>
                          <div><strong>Progress:</strong> {Math.round(progress)}%</div>
                          <div><strong>Status:</strong> {smartIndicator.message}</div>
                        </div>
                      </div>
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Comments & Feedback</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddComment(milestone.id)}
                        >
                          Add Comment
                        </Button>
                      </div>
                      
                      {/* Comments List */}
                      <div className="space-y-2">
                        {milestone.clientComments?.map((comment) => (
                          <div key={comment.id} className="p-3 bg-white border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                              <span className="text-xs text-gray-500">
                                {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.text}</p>
                          </div>
                        ))}
                        {(!milestone.clientComments || milestone.clientComments.length === 0) && (
                          <p className="text-sm text-gray-500 italic">No comments yet. Add the first one!</p>
                        )}
                      </div>

                      {/* New Comment Form */}
                      {newComment && newComment.milestoneId === milestone.id && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h5 className="font-medium mb-2">Add Comment</h5>
                          <Textarea
                            placeholder="Write your comment or feedback..."
                            value={newComment.text}
                            onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                            className="mb-3"
                          />
                          <div className="flex items-center space-x-2">
                            <Button onClick={saveComment} size="sm">Post Comment</Button>
                            <Button variant="outline" onClick={() => setNewComment(null)} size="sm">Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Milestone Editing Form */}
                {editingMilestone === milestone.id && userRole === 'provider' && editingMilestoneData && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium mb-3">Edit Phase Settings</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Phase Title"
                          value={editingMilestoneData.title || ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { ...prev, title: e.target.value } : null)}
                        />
                        <Input
                          placeholder="Purpose of this phase"
                          value={editingMilestoneData.purpose || ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { ...prev, purpose: e.target.value } : null)}
                        />
                      </div>
                      <Textarea
                        placeholder="Phase Description"
                        value={editingMilestoneData.description || ''}
                        onChange={(e) => setEditingMilestoneData(prev => prev ? { ...prev, description: e.target.value } : null)}
                      />
                      <Input
                        placeholder="Main Goal of this phase"
                        value={editingMilestoneData.mainGoal || ''}
                        onChange={(e) => setEditingMilestoneData(prev => prev ? { ...prev, mainGoal: e.target.value } : null)}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="date"
                          value={editingMilestoneData.startDate ? format(new Date(editingMilestoneData.startDate), 'yyyy-MM-dd') : ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            startDate: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()
                          } : null)}
                        />
                        <Input
                          type="date"
                          value={editingMilestoneData.endDate ? format(new Date(editingMilestoneData.endDate), 'yyyy-MM-dd') : ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            endDate: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()
                          } : null)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          placeholder="Estimated Hours"
                          value={editingMilestoneData.estimatedHours || ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            estimatedHours: parseInt(e.target.value) || 0 
                          } : null)}
                        />
                        <select
                          value={editingMilestoneData.status || 'pending'}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            status: e.target.value as 'pending' | 'in_progress' | 'completed' 
                          } : null)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="pending">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={handleSaveEdit} size="sm">Save Changes</Button>
                        <Button variant="outline" onClick={handleCancelEdit} size="sm">Cancel</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
