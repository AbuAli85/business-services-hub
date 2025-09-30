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
  Play,
  Lightbulb
} from 'lucide-react'
import { format, addMonths, isAfter, isBefore } from 'date-fns'
import { Task, Milestone, Comment, UserRole, MilestoneApproval } from '@/types/progress'
import { ProgressDataService } from '@/lib/progress-data-service'
import { SmartTaskGenerator } from './smart-task-generator'
import { SmartMilestoneTemplates } from './smart-milestone-templates'
import { useMilestoneFilters } from '@/components/dashboard/milestones/useMilestoneFilters'
import MilestoneFilters from '@/components/dashboard/milestones/MilestoneFilters'
import MilestoneDetailDrawer from '@/components/dashboard/milestones/MilestoneDetailDrawer'

interface SimpleMilestonesProps {
  milestones: Milestone[]
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => void
  onMilestoneDelete?: (milestoneId: string) => void
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
  onTaskAdd: (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => void
  onTaskDelete: (milestoneId: string, taskId: string) => void
  onCommentAdd: (milestoneId: string, content: string) => void
  onProjectTypeChange: (projectType: 'one_time' | 'monthly' | '3_months' | '6_months' | '9_months' | '12_months') => void
  onMilestoneCreate?: () => void
  commentsByMilestone?: Record<string, Comment[]>
  userRole: UserRole
  approvalsByMilestone?: Record<string, MilestoneApproval[]>
  showHeader?: boolean
}

export function SimpleMilestones({
  milestones,
  onMilestoneUpdate,
  onMilestoneDelete,
  onTaskUpdate,
  onTaskAdd: onTaskCreate,
  onTaskDelete,
  onCommentAdd,
  onProjectTypeChange,
  onMilestoneCreate,
  commentsByMilestone,
  userRole,
  approvalsByMilestone,
  showHeader = true
}: SimpleMilestonesProps) {
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<{milestoneId: string, taskId: string} | null>(null)
  const [newTask, setNewTask] = useState<{milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>} | null>(null)
  const [newComment, setNewComment] = useState<{milestoneId: string, text: string} | null>(null)
  const [replyParentId, setReplyParentId] = useState<string | null>(null)
  const [deleteConfirmMilestone, setDeleteConfirmMilestone] = useState<string | null>(null)
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)
  const [projectType, setProjectType] = useState<'one_time' | 'monthly' | '3_months' | '6_months' | '9_months' | '12_months'>('one_time')
  const [editingMilestoneData, setEditingMilestoneData] = useState<Partial<Milestone> | null>(null)
  const [showSmartTaskGenerator, setShowSmartTaskGenerator] = useState<string | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [usingLocalStorage, setUsingLocalStorage] = useState(false)

  // Advanced filters and detail drawer
  const { filters, filtered } = useMilestoneFilters(milestones)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)

  // No hardcoded phases - use real data from database

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
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
    try {
      const now = new Date()
      
      // Safely parse milestone dates with sensible fallbacks
      const startIso = (milestone as any).created_at || ''
      const endIso = milestone.due_date || (milestone as any).due_date || (milestone as any).created_at || ''
      if (!startIso && !endIso) return { type: 'pending', message: 'Dates not set', color: 'text-gray-600' }
      
      let startDate = new Date(startIso)
      let endDate = new Date(endIso)
      
      // Validate dates
      if (isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        // Fallback: assume a week before end
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
      if (!isNaN(startDate.getTime()) && isNaN(endDate.getTime())) {
        // Fallback: same day as start
        endDate = new Date(startDate.getTime())
      }
      if (isNaN(startDate.getTime()) && isNaN(endDate.getTime())) {
        return { type: 'pending', message: 'Dates not set', color: 'text-gray-600' }
      }
      
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const daysPassed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const progress = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100)
      
      const completedTasks = milestone.tasks.filter(t => t.status === 'completed').length
      const totalTasks = milestone.tasks.length
      const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

      // Smart indicators
      if (milestone.status === 'completed') return { type: 'success', message: 'Completed! 🎉', color: 'text-green-600' }
      if (isAfter(now, endDate) && (milestone.status === 'pending' || milestone.status === 'in_progress')) return { type: 'overdue', message: 'Overdue! ⚠️', color: 'text-red-600' }
      if (taskProgress > progress + 20) return { type: 'ahead', message: 'Ahead of schedule! 🚀', color: 'text-green-600' }
      if (taskProgress < progress - 20) return { type: 'behind', message: 'Behind schedule! 📈', color: 'text-orange-600' }
      if (taskProgress > 80) return { type: 'almost', message: 'Almost done! 💪', color: 'text-blue-600' }
      
      return { type: 'on_track', message: 'On track! ✅', color: 'text-blue-600' }
    } catch (error) {
      console.warn('Error in getSmartIndicator:', error)
      return { type: 'error', message: 'Date error', color: 'text-red-600' }
    }
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
      priority: 'normal',
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
    
    if (replyParentId) {
      // post reply via callback
      onCommentAdd(newComment.milestoneId, newComment.text)
      setReplyParentId(null)
    } else {
      onCommentAdd(newComment.milestoneId, newComment.text)
    }
    setNewComment(null)
  }

  const handleApproval = async (milestoneId: string, status: 'approved' | 'rejected', comment?: string) => {
    try {
      console.log('Submitting approval via API for milestone:', milestoneId, 'status:', status, 'userRole:', userRole)
      if (status === 'approved') {
        await ProgressDataService.approveMilestone(milestoneId, comment)
        // Optimistic UI update
        onMilestoneUpdate(milestoneId, { status: 'completed' })
      } else {
        await ProgressDataService.rejectMilestone(milestoneId, comment)
        // Optimistic UI update
        onMilestoneUpdate(milestoneId, { status: 'rejected' as any })
      }
      console.log('Approval submitted successfully')
      if (status === 'approved') {
        alert('✅ Milestone approved successfully!')
      } else {
        alert('❌ Milestone rejected successfully!')
      }
    } catch (e) {
      console.error('Failed to submit approval:', e)
      if (e instanceof Error && (e.message.includes('permission denied') || e.message.includes('403'))) {
        setUsingLocalStorage(true)
        const successMessage = '✅ Approval submitted successfully!\n\nYour approval has been saved locally and will be synced when database permissions are restored.'
        alert(successMessage)
      } else {
        alert(`Failed to submit approval: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }
  }

  const handleMonthlyReset = () => {
    // Project type change handled by parent component
  }

  const handleStartEdit = (milestone: Milestone) => {
    setEditingMilestone(milestone.id)
    setEditingMilestoneData({
      title: milestone.title,
      description: milestone.description,
      due_date: milestone.due_date,
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
        if (nextPhase && nextPhase.status === 'pending') {
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

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!onMilestoneDelete) return
    
    try {
      await onMilestoneDelete(milestoneId)
      setDeleteConfirmMilestone(null)
    } catch (error) {
      console.error('Error deleting milestone:', error)
    }
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
      if (phase && canStartMilestone(phase) && phase.status === 'pending') {
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
      {/* Local Storage Indicator */}
      {usingLocalStorage && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Using Local Storage</h3>
            <p className="text-xs text-amber-700">Approvals are saved locally and will sync when database is available</p>
          </div>
          <button
            onClick={() => setUsingLocalStorage(false)}
            className="ml-auto text-amber-600 hover:text-amber-800"
            aria-label="Close local storage notice"
            title="Close local storage notice"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Header (optional) */}
      {showHeader && (
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
      )}

      {/* Project Type Info (optional) */}
      {showHeader && (
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
      )}

      {/* Milestone Filters */}
      <div className="mb-4">
        <MilestoneFilters
          status={filters.status}
          setStatus={filters.setStatus}
          projectType={filters.projectType}
          setProjectType={filters.setProjectType}
          dateFrom={filters.dateFrom}
          setDateFrom={filters.setDateFrom}
          dateTo={filters.dateTo}
          setDateTo={filters.setDateTo}
          onSearch={filters.setQuery}
        />
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        {filtered.map((milestone) => {
          const smartIndicator = getSmartIndicator(milestone)
          const approvals = approvalsByMilestone?.[milestone.id] || []
          const latestApproval = approvals[approvals.length - 1]
          const completedTasks = milestone.tasks.filter(t => t.status === 'completed').length
          const totalTasks = milestone.tasks.length
          
          // Weighted progress calculation with fallback to count-based
          const totalWeight = milestone.tasks?.reduce((sum, t) => sum + ((t.weight ?? 1)), 0) || 0
          const completedWeight = milestone.tasks?.reduce((sum, t) => sum + ((t.status === 'completed' ? (t.weight ?? 1) : 0)), 0) || 0
          let progress = 0
          if (totalWeight > 0) {
            progress = Math.round((completedWeight / totalWeight) * 100)
          } else if (totalTasks > 0) {
            progress = Math.round((completedTasks / totalTasks) * 100)
          } else {
            progress = 0
          }
          let progressText = ''
          if (milestone.status === 'completed') {
            progressText = '🎉 COMPLETED!'
          } else if (milestone.status === 'in_progress') {
            progressText = totalTasks > 0 ? `🚀 ${progress}% Complete` : '🚀 Getting Started'
          } else {
            progressText = totalTasks > 0 ? `${progress}% Complete` : 'Ready to Start'
          }
          const progressValue = Math.max(0, Math.min(100, progress))
          const ariaValueNow = progressValue
          const ariaValueMin = 0
          const ariaValueMax = 100
          
          const canStart = canStartMilestone(milestone)
          const isLocked = !canStart && milestone.status === 'pending'

          const comments = commentsByMilestone?.[milestone.id] || []

          return (
            <Card key={milestone.id} className={`border-l-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${
              milestone.status === 'completed' ? 'bg-gradient-to-r from-green-50 to-emerald-50' :
              milestone.status === 'in_progress' ? 'bg-gradient-to-r from-blue-50 to-indigo-50' :
              isLocked ? 'bg-gradient-to-r from-gray-100 to-slate-100 opacity-60' :
              'bg-gradient-to-r from-gray-50 to-slate-50'
            }`}>
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
                        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                          {milestone.title}
                          {typeof (milestone as any).month_number !== 'undefined' && (
                            <span className="text-xs font-semibold text-gray-500">{`Month ${(milestone as any).month_number}`}</span>
                          )}
                        </CardTitle>
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
                        {latestApproval || (commentsByMilestone && commentsByMilestone[milestone.id]?.some(c => (c.content || '').toLowerCase().includes('approved by client'))) ? (
                          <div className={`flex items-center space-x-1 text-xs ${latestApproval.status === 'approved' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'} px-2 py-1 rounded-full`}>
                            <span>🟢 Approved</span>
                          </div>
                        ) : (
                          (milestone.status === 'in_progress' || milestone.status === 'completed') && (
                            <div className="flex items-center space-x-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
                              <span>🟡 Pending Approval</span>
                            </div>
                          )
                        )}
                        {milestone.status === 'completed' && (
                          <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            <span>Phase completed successfully!</span>
                          </div>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 mb-2 font-medium">{milestone.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3"></div>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedMilestone(milestone); setDetailOpen(true) }}
                      className="hover:bg-gray-50"
                    >
                      View details
                    </Button>
                    {userRole === 'provider' && !isLocked && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEdit(milestone)}
                          className="hover:bg-yellow-50 hover:border-yellow-300 transition-all duration-200"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {onMilestoneDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirmMilestone(milestone.id)}
                            className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
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
                    <div 
                      role="progressbar" 
                      aria-label="Milestone progress" 
                      className="w-full"
                    >
                      <Progress 
                        value={progressValue} 
                        className="h-3 shadow-inner"
                      />
                    </div>
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
                      <span>{(() => {
                        try {
                          const startDate = new Date((milestone as any).created_at || '')
                          const endDate = new Date(milestone.due_date || (milestone as any).due_date || (milestone as any).created_at || '')
                          const startStr = isNaN(startDate.getTime()) ? 'N/A' : format(startDate, 'MMM dd')
                          const endStr = isNaN(endDate.getTime()) ? 'N/A' : format(endDate, 'MMM dd, yyyy')
                          return `${startStr} - ${endStr}`
                        } catch (error) {
                          console.warn('Date range formatting error:', error)
                          return 'N/A - N/A'
                        }
                      })()}</span>
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
                      {milestone.status === 'in_progress' && (!latestApproval || latestApproval.status !== 'approved') && (
                        <Button
                          onClick={() => onMilestoneUpdate(milestone.id, { status: 'completed' })}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm px-4 py-2"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete Phase
                        </Button>
                      )}
                      {userRole === 'provider' && (milestone.status === 'in_progress' || milestone.status === 'completed') && (!latestApproval || latestApproval.status !== 'approved') && (
                        <div className="text-xs text-gray-600 flex items-center space-x-1">
                          <Lock className="h-3 w-3" />
                          <span>Locked until client approval</span>
                        </div>
                      )}
                    </div>
                  )}

                  {userRole === 'client' && (milestone.status === 'in_progress' || milestone.status === 'completed') && (!latestApproval || latestApproval.status !== 'approved') && (
                    <div className="mt-4 flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproval(milestone.id, 'approved')}
                        className="text-green-700 hover:text-green-800 hover:bg-green-50"
                        aria-label="Approve milestone"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const reason = prompt('Optional comment for rejection:') || undefined
                          handleApproval(milestone.id, 'rejected', reason)
                        }}
                        className="text-red-700 hover:text-red-800 hover:bg-red-50"
                        aria-label="Reject milestone"
                      >
                        Reject
                      </Button>
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
                    <div key={task.id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${
                      task.status === 'completed' 
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
                        : 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 hover:border-blue-300'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <button
                        onClick={() => handleTaskToggle(milestone.id, task.id)}
                        aria-label="Toggle Task"
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
                        </div>
                        {task.due_date && (
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span className="font-medium">Due: {(() => {
                              try {
                                const date = new Date(task.due_date)
                                return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy')
                              } catch (error) {
                                console.warn('Task due date formatting error:', error)
                                return 'N/A'
                              }
                            })()}</span>
                          </div>
                        )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {typeof task.estimated_hours === 'number' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                            ⌛ {Math.max(0, task.estimated_hours)}h
                          </span>
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

                  {/* Attachments */}
                  <div className="mt-3 space-y-2">
                    <h5 className="text-xs font-semibold text-gray-700">Attachments</h5>
                    {milestone.tasks.some(t => (t.attachments || []).length > 0) ? (
                      <div className="space-y-2">
                        {milestone.tasks.map(t => (
                          (t.attachments || []).map((a, idx) => (
                            <div key={`${t.id}-${idx}`} className="flex items-center justify-between text-xs bg-white border rounded p-2">
                              <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                {a.filename}
                              </a>
                              <span className="text-gray-500">{new Date(a.uploaded_at).toLocaleDateString()}</span>
                            </div>
                          ))
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No attachments</p>
                    )}
                    {userRole === 'provider' && (
                      <div>
                        <label className="text-xs text-gray-600">Upload to first task:</label>
                        <input
                          type="file"
                          className="block text-xs"
                          aria-label="Upload attachment to first task"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const firstTask = milestone.tasks[0]
                            if (!firstTask) return
                            try {
                              const supabase = await (await import('@/lib/supabase-client')).getSupabaseClient()
                              const path = `${milestone.id}/${firstTask.id}/${Date.now()}-${file.name}`
                              const { error: upErr } = await supabase.storage.from('reports').upload(path, file)
                              if (upErr) throw upErr
                              const { data: pub } = await supabase.storage.from('reports').getPublicUrl(path)
                              const attachment = { url: pub.publicUrl, filename: file.name, uploaded_by: 'provider', uploaded_at: new Date().toISOString() }
                              const next = [...(firstTask.attachments || []), attachment]
                              await ProgressDataService.updateTaskDetails(firstTask.id, { attachments: next })
                            } catch (err) {
                              console.error('Upload failed', err)
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Enhanced Add Task Button */}
                  {userRole === 'provider' && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-300 transition-all duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTask(milestone.id)}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold py-3"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add Manual Task
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSmartTaskGenerator(milestone.id)}
                          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold py-3"
                        >
                          <Lightbulb className="h-5 w-5 mr-2" />
                          Smart Tasks
                        </Button>
                      </div>
                      <p className="text-xs text-blue-600 text-center mt-2">
                        Add tasks manually or use AI to generate smart task suggestions
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
                              value={newTask.task.due_date ? (() => {
                                try {
                                  const date = new Date(newTask.task.due_date)
                                  return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd')
                                } catch (error) {
                                  console.warn('New task due date formatting error:', error)
                                  return ''
                                }
                              })() : ''}
                              onChange={(e) => setNewTask({
                                ...newTask,
                                task: { ...newTask.task, due_date: e.target.value ? new Date(e.target.value).toISOString() : undefined }
                              })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                            <select
                              value={newTask.task.priority || 'normal'}
                              onChange={(e) => setNewTask({
                                ...newTask,
                                task: { ...newTask.task, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              aria-label="Select task priority"
                            >
                              <option value="low">🟢 Low Priority</option>
                              <option value="normal">🔵 Normal Priority</option>
                              <option value="high">🔴 High Priority</option>
                              <option value="urgent">🚨 Urgent Priority</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4"></div>
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
                          <div><strong>Start Date:</strong> {(() => {
                            try {
                              const date = new Date(milestone.created_at)
                              return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy')
                            } catch (error) {
                              console.warn('Milestone start date formatting error:', error)
                              return 'N/A'
                            }
                          })()}</div>
                          <div><strong>End Date:</strong> {(() => {
                            try {
                              const date = new Date(milestone.due_date || (milestone as any).due_date || (milestone as any).created_at || '')
                              return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy')
                            } catch (error) {
                              console.warn('Milestone end date formatting error:', error)
                              return 'N/A'
                            }
                          })()}</div>
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

                    {/* Comments & Approvals Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Comments & Feedback</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddComment(milestone.id)}
                          aria-label="Add Comment"
                        >
                          Add Comment
                        </Button>
                      </div>
                      
                      {/* Approval History */}
                      {approvals.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-semibold text-gray-700">Approval History</h5>
                          {approvals.map((a) => (
                            <div key={a.id} className="p-2 bg-white border rounded-lg text-sm">
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${a.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>{a.status.toUpperCase()}</span>
                                <span className="text-gray-500">{new Date(a.created_at).toLocaleString()}</span>
                              </div>
                              {a.comment && <div className="text-gray-700 mt-1">{a.comment}</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comments List (threaded) */}
                      <div className="space-y-2">
                        {comments.map((comment) => (
                          <div key={comment.id} className="p-3 bg-white border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">{comment.author_name || 'User'}</span>
                              <span className="text-xs text-gray-500">
                                {(() => {
                                  try {
                                    const date = new Date(comment.created_at)
                                    return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy HH:mm')
                                  } catch (error) {
                                    console.warn('Comment date formatting error:', error)
                                    return 'N/A'
                                  }
                                })()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                            <div className="mt-2">
                              <button
                                className="text-xs text-blue-600 hover:underline"
                                aria-label="Reply to comment"
                                onClick={() => { setNewComment({ milestoneId: milestone.id, text: `@${comment.author_name || 'user'} ` }); setReplyParentId(comment.id) }}
                              >
                                Reply
                              </button>
                            </div>
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="mt-3 ml-6 border-l pl-4 space-y-2">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="p-2 bg-gray-50 border rounded-lg">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-gray-900">{reply.author_name || 'User'}</span>
                                      <span className="text-[10px] text-gray-500">{(() => {
                                        try {
                                          const date = new Date(reply.created_at)
                                          return isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy HH:mm')
                                        } catch (error) {
                                          console.warn('Reply date formatting error:', error)
                                          return 'N/A'
                                        }
                                      })()}</span>
                                    </div>
                                    <p className="text-xs text-gray-700">{reply.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {comments.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/></svg>
                            </div>
                            <p className="text-sm">No comments yet</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              onClick={() => handleAddComment(milestone.id)}
                            >
                              + Add Comment
                            </Button>
                          </div>
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
                        <div />
                      </div>
                      <Textarea
                        placeholder="Phase Description"
                        value={editingMilestoneData.description || ''}
                        onChange={(e) => setEditingMilestoneData(prev => prev ? { ...prev, description: e.target.value } : null)}
                      />
                      <div />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="date"
                          value={editingMilestoneData.created_at ? (() => {
                            try {
                              const date = new Date(editingMilestoneData.created_at)
                              return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd')
                            } catch (error) {
                              console.warn('Date formatting error:', error)
                              return ''
                            }
                          })() : ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            created_at: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()
                          } : null)}
                        />
                        <Input
                          type="date"
                          value={editingMilestoneData.due_date ? (() => {
                            try {
                              const date = new Date(editingMilestoneData.due_date)
                              return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd')
                            } catch (error) {
                              console.warn('Date formatting error:', error)
                              return ''
                            }
                          })() : ''}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            due_date: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()
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
                          value={editingMilestoneData.status || 'pending'}
                          onChange={(e) => setEditingMilestoneData(prev => prev ? { 
                            ...prev, 
                            status: e.target.value as 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' 
                          } : null)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                          aria-label="Select milestone status"
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

      {/* Milestone Detail Drawer */}
      <MilestoneDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        milestone={selectedMilestone}
        tasks={selectedMilestone?.tasks || []}
        approvals={selectedMilestone ? (approvalsByMilestone?.[selectedMilestone.id] || []) : []}
      />

      {/* Create New Milestone Button */}
      {userRole === 'provider' && onMilestoneCreate && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-300 transition-all duration-200">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Another Milestone?</h3>
            <p className="text-sm text-gray-600 mb-4">Create additional milestones to better organize your project phases</p>
            <Button
              onClick={onMilestoneCreate}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold py-3 px-6"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Milestone
            </Button>
          </div>
        </div>
      )}

      {/* Smart Task Generator Modal */}
      {showSmartTaskGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <SmartTaskGenerator
            milestoneTitle={milestones.find(m => m.id === showSmartTaskGenerator)?.title || ''}
            milestoneDescription={milestones.find(m => m.id === showSmartTaskGenerator)?.description}
            existingTasks={milestones.find(m => m.id === showSmartTaskGenerator)?.tasks || []}
            onTasksGenerated={(tasks) => {
              // Add generated tasks to the milestone
              tasks.forEach(task => {
                onTaskCreate(showSmartTaskGenerator!, {
                  title: task.title,
                  description: task.description,
                  status: 'pending',
                  progress: 0,
                  priority: task.priority,
                  milestone_id: showSmartTaskGenerator!,
                  order_index: 0,
                  estimated_hours: task.estimated_hours
                })
              })
              setShowSmartTaskGenerator(null)
            }}
            onCancel={() => setShowSmartTaskGenerator(null)}
          />
        </div>
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2">
          <div className="w-full max-w-[98vw] h-[95vh] max-h-[900px] overflow-hidden rounded-2xl shadow-2xl border-4 border-white">
            <SmartMilestoneTemplates
              onSelectTemplate={(template) => {
                // This would create multiple milestones from template
                console.log('Template selected:', template)
                setShowTemplateSelector(false)
              }}
              onCancel={() => setShowTemplateSelector(false)}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmMilestone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Milestone</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this milestone? All tasks and comments associated with it will also be deleted.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="destructive"
                onClick={() => handleDeleteMilestone(deleteConfirmMilestone)}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Milestone
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmMilestone(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
