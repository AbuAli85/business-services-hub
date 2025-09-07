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
  Lock,
  AlertCircle,
  CheckCircle2,
  Play
} from 'lucide-react'
import { format, addMonths, isAfter, isBefore } from 'date-fns'
import { Task, Milestone, Comment, UserRole } from '@/types/progress'

interface SimpleMilestonesProps {
  milestones: Milestone[]
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => void
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTaskAdd: (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => void
  onTaskDelete: (milestoneId: string, taskId: string) => void
  onCommentAdd: (milestoneId: string, content: string) => void
  onProjectTypeChange: (projectType: 'one_time' | 'monthly' | '3_months' | '6_months' | '9_months' | '12_months') => void
  commentsByMilestone?: Record<string, Comment[]>
  userRole: UserRole
}

export function SimpleMilestones({
  milestones,
  onMilestoneUpdate,
  onTaskUpdate,
  onTaskAdd: onTaskCreate,
  onTaskDelete,
  onCommentAdd,
  onProjectTypeChange,
  commentsByMilestone,
  userRole
}: SimpleMilestonesProps) {
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<{milestoneId: string, taskId: string} | null>(null)
  const [newTask, setNewTask] = useState<{milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>} | null>(null)
  const [newComment, setNewComment] = useState<{milestoneId: string, text: string} | null>(null)
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)
  const [projectType, setProjectType] = useState<'one_time' | 'monthly' | '3_months' | '6_months' | '9_months' | '12_months'>('one_time')
  const [editingMilestoneData, setEditingMilestoneData] = useState<Partial<Milestone> | null>(null)

  // No hardcoded phases - use real data from database

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'not_started': return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const getSmartIndicator = (milestone: Milestone) => {
    const now = new Date()
    const startDate = new Date(milestone.start_date)
    const endDate = new Date(milestone.end_date)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const progress = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100)
    
    const completedTasks = milestone.tasks.filter(t => t.status === 'completed').length
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

    onTaskUpdate(taskId, { status: task.status === 'completed' ? 'pending' : 'completed' })
  }

  const handleAddTask = (milestoneId: string) => {
    const task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'> = {
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      estimated_hours: 1,
      milestone_id: milestoneId,
      order_index: 0
    }
    setNewTask({ milestoneId, task })
  }

  const saveNewTask = () => {
    if (!newTask) return
    onTaskCreate(newTask.milestoneId, { ...newTask.task })
    setNewTask(null)
  }

  const handleRecurringTask = (milestoneId: string, task: Task) => {
    // For now, we'll skip recurring tasks as they're not part of the standardized interface
    // This can be implemented later if needed
    console.log('Recurring task functionality not implemented in standardized interface')
  }

  const handleAddComment = (milestoneId: string) => {
    setNewComment({ milestoneId, text: '' })
  }

  const saveComment = () => {
    if (!newComment || !newComment.text.trim()) return
    
    onCommentAdd(newComment.milestoneId, newComment.text)
    setNewComment(null)
  }

  const handleMonthlyReset = () => {
    // Project type change handled by parent component
  }

  const handleStartEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone.id)
    setEditingMilestoneData({
      title: milestone.title,
      description: milestone.description,
      purpose: milestone.purpose,
      mainGoal: milestone.mainGoal,
      start_date: milestone.start_date,
      end_date: milestone.end_date,
      estimated_hours: milestone.estimated_hours,
      status: milestone.status
    })
  }

  const handleSaveEdit = () => {
    if (editingMilestone && editingMilestoneData) {
      // Check if this milestone can be started (previous milestone must be completed)
      const currentMilestone = milestones.find(m => m.id === editingMilestone)
      if (currentMilestone && editingMilestoneData.status === 'in_progress') {
        const currentPhaseNumber = currentMilestone.order_index
        const previousPhase = milestones.find(m => m.order_index === currentPhaseNumber - 1)
        
        if (previousPhase && previousPhase.status !== 'completed') {
          alert('Please complete the previous phase before starting this one.')
          return
        }
      }
      
      onMilestoneUpdate(editingMilestone, editingMilestoneData)
      
      // Auto-start next phase if current phase is completed
      if (editingMilestoneData.status === 'completed' && currentMilestone) {
        const nextPhase = milestones.find(m => m.order_index === currentMilestone.order_index + 1)
        if (nextPhase && nextPhase.status === 'not_started') {
          setTimeout(() => {
            onMilestoneUpdate(nextPhase.id, { status: 'in_progress' })
          }, 1000) // Small delay to show completion first
        }
      }
      
      setEditingMilestone(null)
      setEditingMilestoneData(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingMilestone(null)
    setEditingMilestoneData(null)
  }

  const canStartMilestone = (milestone: Milestone) => {
    if (milestone.status === 'completed') return true
    if (milestone.status === 'in_progress') return true
    if (milestone.order_index === 1) return true
    
    const previousPhase = milestones.find(m => m.order_index === milestone.order_index - 1)
    return previousPhase ? previousPhase.status === 'completed' : false
  }

  const getNextAvailablePhase = () => {
    // Find the first phase that can be started
    for (let i = 1; i <= 4; i++) {
      const phase = milestones.find(m => m.order_index === i)
      if (phase && canStartMilestone(phase) && phase.status === 'not_started') {
        return phase
      }
    }
    return null
  }

  const autoStartNextPhase = () => {
    const nextPhase = getNextAvailablePhase()
    if (nextPhase) {
      onMilestoneUpdate(nextPhase.id, { status: 'in_progress' })
    }
  }

  const getProjectPeriodInfo = () => {
    switch (projectType) {
      case 'one_time':
        return { label: 'One Time Project', description: 'Single project completion', duration: 'Variable' }
      case 'monthly':
        return { label: 'Monthly Recurring', description: 'Repeats every month', duration: '1 month cycles' }
      case '3_months':
        return { label: '3 Month Project', description: 'Quarterly project cycle', duration: '3 months' }
      case '6_months':
        return { label: '6 Month Project', description: 'Semi-annual project cycle', duration: '6 months' }
      case '9_months':
        return { label: '9 Month Project', description: 'Extended project cycle', duration: '9 months' }
      case '12_months':
        return { label: '12 Month Project', description: 'Annual project cycle', duration: '12 months' }
      default:
        return { label: 'One Time Project', description: 'Single project completion', duration: 'Variable' }
    }
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
                  const newType = e.target.value as 'one_time' | 'monthly' | '3_months' | '6_months' | '9_months' | '12_months'
                  setProjectType(newType)
                  onProjectTypeChange(newType)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                aria-label="Select project type"
              >
                <option value="one_time">One Time Project</option>
                <option value="monthly">Monthly Recurring</option>
                <option value="3_months">3 Month Project</option>
                <option value="6_months">6 Month Project</option>
                <option value="9_months">9 Month Project</option>
                <option value="12_months">12 Month Project</option>
              </select>
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm border">
              <Badge variant="outline" className="text-sm font-semibold">
                {milestones.filter(m => m.status === 'completed').length} of 4 completed
              </Badge>
            </div>
            {userRole === 'provider' && getNextAvailablePhase() && (
              <Button
                onClick={autoStartNextPhase}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Next Phase
              </Button>
            )}
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
        projectType === 'monthly' || projectType.includes('months')
          ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' 
          : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
      }`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
              projectType === 'monthly' || projectType.includes('months')
                ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                : 'bg-gradient-to-br from-green-500 to-emerald-500'
            }`}>
              {projectType === 'monthly' || projectType.includes('months') ? (
                <Repeat className="h-6 w-6 text-white" />
              ) : (
                <Target className="h-6 w-6 text-white" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold mb-2 ${
              projectType === 'monthly' || projectType.includes('months') ? 'text-purple-900' : 'text-green-900'
            }`}>
              {getProjectPeriodInfo().label}
            </h3>
            <p className={`text-sm font-medium ${
              projectType === 'monthly' || projectType.includes('months') ? 'text-purple-700' : 'text-green-700'
            }`}>
              {getProjectPeriodInfo().description}
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                projectType === 'monthly' || projectType.includes('months') ? 'bg-purple-500' : 'bg-green-500'
              }`}></div>
              <span className={`text-xs font-semibold ${
                projectType === 'monthly' || projectType.includes('months') ? 'text-purple-600' : 'text-green-600'
              }`}>
                Duration: {getProjectPeriodInfo().duration}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones - Always exactly 4 phases */}
      <div className="space-y-4">
        {milestones.map((milestone) => {
          const smartIndicator = getSmartIndicator(milestone)
          const completedTasks = milestone.tasks.filter(t => t.status === 'completed').length
          const totalTasks = milestone.tasks.length
          
          // Enhanced progress calculation logic
          let progress = 0
          let progressText = ''
          
          if (milestone.status === 'completed') {
            progress = 100
            progressText = '🎉 COMPLETED!'
          } else if (milestone.status === 'in_progress') {
            if (totalTasks > 0) {
              progress = Math.round((completedTasks / totalTasks) * 100)
              progressText = `🚀 ${progress}% Complete`
            } else {
              progress = 25 // Default for in-progress with no tasks
              progressText = '🚀 Getting Started'
            }
          } else {
            if (totalTasks > 0) {
              progress = Math.round((completedTasks / totalTasks) * 100)
              progressText = `${progress}% Complete`
            } else {
              progress = 0
              progressText = 'Ready to Start'
            }
          }
          
          const canStart = canStartMilestone(milestone)
          const isLocked = !canStart && milestone.status === 'pending'

          return (
            <Card key={milestone.id} className={`border-l-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${
              milestone.status === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
              milestone.status === 'in_progress' ? 'bg-gradient-to-r from-blue-50 to-indigo-50' :
              isLocked ? 'bg-gradient-to-r from-gray-100 to-slate-100 opacity-60' :
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
                      <span className="text-white font-bold text-lg">{milestone.order_index}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-xl font-bold text-gray-900">{milestone.title}</CardTitle>
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold border-2 shadow-sm ${getStatusColor(milestone.status)}`}>
                          {isLocked ? '🔒 LOCKED' : 
                           milestone.status === 'completed' ? '✅ COMPLETED' :
                           milestone.status === 'in_progress' ? '🚀 IN PROGRESS' :
                           '⏳ PENDING'}
                        </div>
                        {isLocked && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500 bg-yellow-50 px-2 py-1 rounded-full">
                            <Lock className="h-3 w-3" />
                            <span>Complete previous phase first</span>
                          </div>
                        )}
                        {milestone.status === 'completed' && (
                          <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            <span>Phase completed successfully!</span>
                          </div>
                        )}
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
                    {userRole === 'provider' && !isLocked && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartEdit(milestone)}
                        className="hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                    {userRole === 'provider' && isLocked && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="opacity-50 cursor-not-allowed"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-700">Progress</span>
                      {milestone.status === 'completed' && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-semibold">COMPLETED</span>
                        </div>
                      )}
                      {milestone.status === 'in_progress' && (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-semibold">IN PROGRESS</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-gray-900">{Math.round(progress)}%</span>
                      <div className={`w-3 h-3 rounded-full ${
                        milestone.status === 'completed' ? 'bg-green-500' :
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
                      <span className="text-sm font-bold text-white drop-shadow-lg">
                        {progressText}
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
                      <span>{format(new Date(milestone.start_date), 'MMM dd')} - {format(new Date(milestone.end_date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  
                  {/* Quick Action Buttons */}
                  {userRole === 'provider' && !isLocked && (
                    <div className="mt-4 flex space-x-2">
                      {milestone.status === 'pending' && (
                        <Button
                          onClick={() => onMilestoneUpdate(milestone.id, { status: 'in_progress' })}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm px-4 py-2"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Phase
                        </Button>
                      )}
                      {milestone.status === 'in_progress' && (
                        <Button
                          onClick={() => onMilestoneUpdate(milestone.id, { status: 'completed' })}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm px-4 py-2"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete Phase
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Enhanced Tasks Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>Tasks ({totalTasks})</span>
                      {totalTasks > 0 && (
                        <div className="flex items-center space-x-1 text-xs text-gray-600">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {completedTasks} completed
                          </span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {totalTasks - completedTasks} remaining
                          </span>
                        </div>
                      )}
                    </h4>
                    {totalTasks === 0 && (
                      <div className="text-xs text-gray-500 italic">
                        No tasks yet - add some to track progress
                      </div>
                    )}
                  </div>
                  {milestone.tasks.map((task) => (
                    <div key={task.id} className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                      task.status === 'completed' 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                        : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 hover:border-blue-300'
                    }`}>
                      <button
                        onClick={() => handleTaskToggle(milestone.id, task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          task.status === 'completed' 
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 border-green-500 text-white shadow-lg' 
                            : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
                        }`}
                      >
                        {task.status === 'completed' && <CheckCircle2 className="h-4 w-4" />}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`text-sm font-semibold ${
                            task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
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
                        {task.due_date && (
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span className="font-medium">Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {task.isRecurring && task.status === 'completed' && (
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

                  {/* Enhanced Add Task Button */}
                  {userRole === 'provider' && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-300 transition-all duration-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTask(milestone.id)}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold py-3"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Add New Task to {milestone.title}
                      </Button>
                      <p className="text-xs text-blue-600 text-center mt-2">
                        Add tasks to track progress and break down this phase into manageable steps
                      </p>
                    </div>
                  )}
                </div>

                {/* Enhanced New Task Form */}
                {newTask && newTask.milestoneId === milestone.id && (
                  <Card className="mt-4 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-lg text-blue-900">Add New Task to {milestone.title}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setNewTask(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          ✕
                        </Button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title *</label>
                          <Input
                            placeholder="Enter a descriptive task title..."
                            value={newTask.task.title}
                            onChange={(e) => setNewTask({
                              ...newTask,
                              task: { ...newTask.task, title: e.target.value }
                            })}
                            className="w-full"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                            <Input
                              type="date"
                              placeholder="Select due date"
                              value={newTask.task.dueDate ? format(new Date(newTask.task.dueDate), 'yyyy-MM-dd') : ''}
                              onChange={(e) => setNewTask({
                                ...newTask,
                                task: { ...newTask.task, dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined }
                              })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                            <select
                              value={newTask.task.priority || 'medium'}
                              onChange={(e) => setNewTask({
                                ...newTask,
                                task: { ...newTask.task, priority: e.target.value as 'low' | 'medium' | 'high' }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              aria-label="Select task priority"
                            >
                              <option value="low">🟢 Low Priority</option>
                              <option value="medium">🟡 Medium Priority</option>
                              <option value="high">🔴 High Priority</option>
                            </select>
                          </div>
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
                              aria-label="Select recurring frequency"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          )}
                        </div>
                        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-blue-200">
                          <Button 
                            onClick={saveNewTask} 
                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                            disabled={!newTask.task.title.trim()}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Task
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setNewTask(null)} 
                            className="px-6 py-2 font-semibold border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
                          >
                            Cancel
                          </Button>
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
                          <div><strong>Start Date:</strong> {format(new Date(milestone.start_date), 'MMM dd, yyyy')}</div>
                          <div><strong>End Date:</strong> {format(new Date(milestone.end_date), 'MMM dd, yyyy')}</div>
                          <div><strong>Estimated Hours:</strong> {milestone.estimated_hours || 0}h</div>
                          <div><strong>Actual Hours:</strong> {milestone.actual_hours || 0}h</div>
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
                          value={editingMilestoneData.start_date ? format(new Date(editingMilestoneData.start_date), 'yyyy-MM-dd') : ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            start_date: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()
                          } : null)}
                        />
                        <Input
                          type="date"
                          value={editingMilestoneData.end_date ? format(new Date(editingMilestoneData.end_date), 'yyyy-MM-dd') : ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            end_date: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()
                          } : null)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          placeholder="Estimated Hours"
                          value={editingMilestoneData.estimated_hours || ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            estimated_hours: parseInt(e.target.value) || 0
                          } : null)}
                        />
                        <select
                          value={editingMilestoneData.status || 'not_started'}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            status: e.target.value as 'not_started' | 'in_progress' | 'completed' 
                          } : null)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          aria-label="Select milestone status"
                        >
                          <option value="not_started">Not Started</option>
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
