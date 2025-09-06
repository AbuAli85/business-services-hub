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
  status: 'not_started' | 'in_progress' | 'completed'
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

  // Standard 4 phases - never more, never less
  const standardPhases = [
    {
      id: 'phase-1',
      title: 'Planning & Setup',
      description: 'Initial planning, requirements gathering, and project setup',
      purpose: 'Establish project foundation and clear requirements',
      mainGoal: 'Complete project planning and setup phase',
      phaseNumber: 1 as const,
      color: '#3B82F6'
    },
    {
      id: 'phase-2', 
      title: 'Development',
      description: 'Core development work and implementation',
      purpose: 'Build and implement the main project features',
      mainGoal: 'Complete all development tasks and features',
      phaseNumber: 2 as const,
      color: '#10B981'
    },
    {
      id: 'phase-3',
      title: 'Testing & Quality',
      description: 'Testing, quality assurance, and bug fixes',
      purpose: 'Ensure quality and fix any issues',
      mainGoal: 'Complete testing and quality assurance',
      phaseNumber: 3 as const,
      color: '#F59E0B'
    },
    {
      id: 'phase-4',
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
          status: 'not_started',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          tasks: [],
          estimatedHours: 0,
          actualHours: 0
        })
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Phases</h2>
          <p className="text-gray-600">4-phase project management system</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Project Type Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Project Type:</span>
            <select
              value={projectType}
              onChange={(e) => {
                const newType = e.target.value as 'one_time' | 'monthly'
                setProjectType(newType)
                onProjectTypeChange(newType)
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="one_time">One Time Project</option>
              <option value="monthly">Monthly Recurring</option>
            </select>
          </div>
          <Badge variant="outline" className="text-sm">
            {milestones.filter(m => m.status === 'completed').length} of 4 completed
          </Badge>
          {projectType === 'monthly' && userRole === 'provider' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMonthlyReset}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Repeat className="h-4 w-4 mr-2" />
              Reset for Next Month
            </Button>
          )}
        </div>
      </div>

      {/* Project Type Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              {projectType === 'monthly' ? 'Monthly Recurring Project' : 'One Time Project'}
            </h3>
            <p className="text-sm text-blue-700">
              {projectType === 'monthly' 
                ? 'This project will repeat monthly with the same 4 phases. Perfect for ongoing services, maintenance, or regular deliverables.'
                : 'This is a one-time project with 4 phases. Once completed, the project is finished.'
              }
            </p>
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
            status: 'not_started' as const,
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
            <Card key={milestone.id} className="border-l-4" style={{ borderLeftColor: milestone.color }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(milestone.status)}`}>
                      Phase {milestone.phaseNumber}: {milestone.status.replace('_', ' ')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{milestone.title}</CardTitle>
                        {milestone.isRecurring && (
                          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                            <Repeat className="h-3 w-3 mr-1" />
                            Monthly
                          </Badge>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                      )}
                      {milestone.purpose && (
                        <p className="text-xs text-blue-600 mt-1"><strong>Purpose:</strong> {milestone.purpose}</p>
                      )}
                      {milestone.mainGoal && (
                        <p className="text-xs text-green-600 mt-1"><strong>Main Goal:</strong> {milestone.mainGoal}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className={`text-sm font-medium ${smartIndicator.color}`}>
                      {smartIndicator.message}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedMilestone(expandedMilestone === milestone.id ? null : milestone.id)}
                    >
                      {expandedMilestone === milestone.id ? 'Collapse' : 'Expand'}
                    </Button>
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
                {editingMilestone === milestone.id && userRole === 'provider' && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium mb-3">Edit Phase Settings</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          placeholder="Phase Title"
                          value={milestone.title}
                          onChange={(e) => onMilestoneUpdate(milestone.id, { title: e.target.value })}
                        />
                        <Input
                          placeholder="Purpose of this phase"
                          value={milestone.purpose || ''}
                          onChange={(e) => onMilestoneUpdate(milestone.id, { purpose: e.target.value })}
                        />
                      </div>
                      <Textarea
                        placeholder="Phase Description"
                        value={milestone.description || ''}
                        onChange={(e) => onMilestoneUpdate(milestone.id, { description: e.target.value })}
                      />
                      <Input
                        placeholder="Main Goal of this phase"
                        value={milestone.mainGoal || ''}
                        onChange={(e) => onMilestoneUpdate(milestone.id, { mainGoal: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="date"
                          value={milestone.startDate}
                          onChange={(e) => onMilestoneUpdate(milestone.id, { startDate: e.target.value })}
                        />
                        <Input
                          type="date"
                          value={milestone.endDate}
                          onChange={(e) => onMilestoneUpdate(milestone.id, { endDate: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          placeholder="Estimated Hours"
                          value={milestone.estimatedHours || ''}
                          onChange={(e) => onMilestoneUpdate(milestone.id, { estimatedHours: parseInt(e.target.value) || 0 })}
                        />
                        <select
                          value={milestone.status}
                          onChange={(e) => onMilestoneUpdate(milestone.id, { status: e.target.value as any })}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button onClick={() => setEditingMilestone(null)} size="sm">Save Changes</Button>
                        <Button variant="outline" onClick={() => setEditingMilestone(null)} size="sm">Cancel</Button>
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
