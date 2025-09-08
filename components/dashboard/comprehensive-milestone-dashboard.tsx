'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Clock, 
  Play, 
  Pause, 
  AlertTriangle, 
  Calendar, 
  Users, 
  FileText, 
  MessageSquare, 
  Eye, 
  Download,
  TrendingUp,
  Target,
  Zap,
  Shield,
  Star,
  Activity,
  BarChart3,
  Timer,
  Award,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ExternalLink
} from 'lucide-react'
import { format, isAfter, isBefore, differenceInDays, differenceInHours } from 'date-fns'
import { Milestone, Task, UserRole } from '@/types/progress'

interface ComprehensiveMilestoneDashboardProps {
  milestones: Milestone[]
  userRole: UserRole
  onMilestoneUpdate?: (milestoneId: string, updates: Partial<Milestone>) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  onTaskAdd?: (milestoneId: string, task: Partial<Task>) => void
  onTaskDelete?: (taskId: string) => void
  onCommentAdd?: (milestoneId: string, comment: string) => void
  onMilestoneApproval?: (milestoneId: string, action: 'approve' | 'reject', notes?: string) => void
  commentsByMilestone?: Record<string, any[]>
  approvalsByMilestone?: Record<string, any[]>
  timeEntries?: any[]
  className?: string
}

interface ProjectStatus {
  overallProgress: number
  completedMilestones: number
  totalMilestones: number
  completedTasks: number
  totalTasks: number
  overdueItems: number
  estimatedHours: number
  actualHours: number
  efficiency: number
  nextDeadline?: Date
  riskLevel: 'low' | 'medium' | 'high'
}

export function ComprehensiveMilestoneDashboard({
  milestones,
  userRole,
  onMilestoneUpdate,
  onTaskUpdate,
  onTaskAdd,
  onTaskDelete,
  onCommentAdd,
  onMilestoneApproval,
  commentsByMilestone = {},
  approvalsByMilestone = {},
  timeEntries = [],
  className = ""
}: ComprehensiveMilestoneDashboardProps) {
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'timeline'>('overview')
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>({
    overallProgress: 0,
    completedMilestones: 0,
    totalMilestones: 0,
    completedTasks: 0,
    totalTasks: 0,
    overdueItems: 0,
    estimatedHours: 0,
    actualHours: 0,
    efficiency: 0,
    riskLevel: 'low'
  })

  // Calculate comprehensive project status
  useEffect(() => {
    const calculateProjectStatus = () => {
      const totalMilestones = milestones.length
      const completedMilestones = milestones.filter(m => m.status === 'completed').length
      
      const allTasks = milestones.flatMap(m => m.tasks || [])
      const totalTasks = allTasks.length
      const completedTasks = allTasks.filter(t => t.status === 'completed').length
      
      const estimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      const actualHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
      
      const overdueItems = milestones.filter(m => {
        if (!m.due_date || m.status === 'completed') return false
        return isAfter(new Date(), new Date(m.due_date))
      }).length + allTasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false
        return isAfter(new Date(), new Date(t.due_date))
      }).length
      
      const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
      const efficiency = estimatedHours > 0 ? Math.round((actualHours / estimatedHours) * 100) : 0
      
      const nextDeadline = milestones
        .filter(m => m.status !== 'completed' && m.due_date)
        .map(m => new Date(m.due_date))
        .sort((a, b) => a.getTime() - b.getTime())[0]
      
      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      if (overdueItems > 0) riskLevel = 'high'
      else if (efficiency > 120 || overallProgress < 30) riskLevel = 'medium'
      
      setProjectStatus({
        overallProgress,
        completedMilestones,
        totalMilestones,
        completedTasks,
        totalTasks,
        overdueItems,
        estimatedHours,
        actualHours,
        efficiency,
        nextDeadline,
        riskLevel
      })
    }
    
    calculateProjectStatus()
  }, [milestones, timeEntries])

  const toggleMilestoneExpansion = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    setExpandedMilestones(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress': return <Play className="h-5 w-5 text-blue-600" />
      case 'pending': return <Clock className="h-5 w-5 text-gray-500" />
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-600" />
      case 'on_hold': return <Pause className="h-5 w-5 text-yellow-600" />
      default: return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${Math.round(hours)}h`
    return `${Math.round(hours / 8)}d`
  }

  const getTimeUntilDeadline = (dueDate: string) => {
    const now = new Date()
    const due = new Date(dueDate)
    const days = differenceInDays(due, now)
    const hours = differenceInHours(due, now)
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`
    return 'Overdue'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Project Status Overview */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              Project Status Overview
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={selectedView === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('overview')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </Button>
              <Button
                variant={selectedView === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('detailed')}
              >
                <Target className="h-4 w-4 mr-2" />
                Detailed
              </Button>
              <Button
                variant={selectedView === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedView('timeline')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Timeline
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Overall Progress</span>
                <span className="text-2xl font-bold text-blue-600">{projectStatus.overallProgress}%</span>
              </div>
              <Progress value={projectStatus.overallProgress} className="h-2" />
              <div className="text-xs text-gray-500">
                {projectStatus.completedMilestones} of {projectStatus.totalMilestones} milestones
              </div>
            </div>

            {/* Task Completion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Tasks Completed</span>
                <span className="text-2xl font-bold text-green-600">{projectStatus.completedTasks}</span>
              </div>
              <div className="text-xs text-gray-500">
                of {projectStatus.totalTasks} total tasks
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${projectStatus.totalTasks > 0 ? (projectStatus.completedTasks / projectStatus.totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Time Tracking */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Time Efficiency</span>
                <span className="text-2xl font-bold text-purple-600">{projectStatus.efficiency}%</span>
              </div>
              <div className="text-xs text-gray-500">
                {formatDuration(projectStatus.actualHours)} / {formatDuration(projectStatus.estimatedHours)}
              </div>
              <div className="flex items-center gap-1">
                <Timer className="h-3 w-3 text-gray-400" />
                <span className="text-xs text-gray-500">Actual vs Estimated</span>
              </div>
            </div>

            {/* Risk Level */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Project Health</span>
                <Badge className={`${getRiskColor(projectStatus.riskLevel)} border-0`}>
                  {projectStatus.riskLevel.toUpperCase()}
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                {projectStatus.overdueItems} overdue items
              </div>
              {projectStatus.nextDeadline && (
                <div className="text-xs text-gray-500">
                  Next: {getTimeUntilDeadline(projectStatus.nextDeadline.toISOString())}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.map((milestone, index) => {
          const isExpanded = expandedMilestones.has(milestone.id)
          const completedTasks = milestone.tasks?.filter(t => t.status === 'completed').length || 0
          const totalTasks = milestone.tasks?.length || 0
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
          const comments = commentsByMilestone[milestone.id] || []
          const approvals = approvalsByMilestone[milestone.id] || []
          const latestApproval = approvals[approvals.length - 1]
          const isOverdue = milestone.due_date && isAfter(new Date(), new Date(milestone.due_date)) && milestone.status !== 'completed'

          return (
            <Card key={milestone.id} className={`transition-all duration-200 hover:shadow-lg ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(milestone.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {milestone.title}
                        </h3>
                        <Badge className={getStatusColor(milestone.status)}>
                          {milestone.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            OVERDUE
                          </Badge>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                      )}
                      
                      {/* Progress and Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>{progress}% Complete</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>{completedTasks}/{totalTasks} Tasks</span>
                        </div>
                        {milestone.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Due: {format(new Date(milestone.due_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                        {milestone.estimated_hours && (
                          <div className="flex items-center gap-1">
                            <Timer className="h-4 w-4" />
                            <span>{formatDuration(milestone.estimated_hours)} Est.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Approval Status */}
                    {latestApproval && (
                      <Badge className={
                        latestApproval.status === 'approved' 
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : 'bg-red-100 text-red-800 border-red-200'
                      }>
                        {latestApproval.status === 'approved' ? (
                          <ThumbsUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ThumbsDown className="h-3 w-3 mr-1" />
                        )}
                        {latestApproval.status.toUpperCase()}
                      </Badge>
                    )}
                    
                    {/* Comments Count */}
                    {comments.length > 0 && (
                      <Badge variant="outline" className="text-gray-600">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {comments.length}
                      </Badge>
                    )}
                    
                    {/* Expand/Collapse Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMilestoneExpansion(milestone.id)}
                      className="p-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        milestone.status === 'completed' 
                          ? 'bg-green-500' 
                          : milestone.status === 'in_progress'
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </CardHeader>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Tasks List */}
                    {milestone.tasks && milestone.tasks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Tasks ({completedTasks}/{totalTasks})
                        </h4>
                        <div className="space-y-2">
                          {milestone.tasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(task.status)}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                                  {task.description && (
                                    <p className="text-xs text-gray-600">{task.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={getStatusColor(task.status)}>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                                {task.due_date && (
                                  <span className="text-xs text-gray-500">
                                    {format(new Date(task.due_date), 'MMM dd')}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {comments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Comments ({comments.length})
                        </h4>
                        <div className="space-y-2">
                          {comments.slice(0, 3).map((comment, idx) => (
                            <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-gray-900">{comment.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {comment.created_by} • {format(new Date(comment.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          ))}
                          {comments.length > 3 && (
                            <p className="text-xs text-gray-500 text-center">
                              +{comments.length - 3} more comments
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Approval History */}
                    {approvals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Approval History
                        </h4>
                        <div className="space-y-2">
                          {approvals.map((approval, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2">
                                {approval.status === 'approved' ? (
                                  <ThumbsUp className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ThumbsDown className="h-4 w-4 text-red-600" />
                                )}
                                <span className="text-sm font-medium text-gray-900">
                                  {approval.status.toUpperCase()}
                                </span>
                                {approval.notes && (
                                  <span className="text-xs text-gray-600">- {approval.notes}</span>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {format(new Date(approval.created_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Project Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Project Progress Summary
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {projectStatus.overallProgress}% complete with {projectStatus.completedTasks} of {projectStatus.totalTasks} tasks finished
            </p>
            <div className="flex justify-center">
              <div className="w-64 bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${projectStatus.overallProgress}%` }}
                />
              </div>
            </div>
            {projectStatus.nextDeadline && (
              <p className="text-xs text-gray-500 mt-2">
                Next deadline: {format(projectStatus.nextDeadline, 'MMMM dd, yyyy')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
