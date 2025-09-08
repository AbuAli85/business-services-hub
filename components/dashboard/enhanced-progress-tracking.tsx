'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Timer,
  Calendar,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  Target,
  TrendingUp,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Filter,
  MoreVertical,
  Copy,
  Archive,
  Flag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Lightbulb,
  BarChart3,
  Clock3,
  Users,
  FileText,
  Paperclip,
  Send,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Calendar as CalendarIcon,
  MapPin,
  Tag,
  Hash,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  X,
  PlusCircle,
  MinusCircle,
  ExternalLink,
  Lock,
  Unlock,
  ShieldCheck,
  Award,
  Trophy,
  Medal,
  Crown,
  Sparkles,
  Rocket,
  Zap as ZapIcon,
  Brain,
  Cpu,
  Database,
  Server,
  Cloud,
  Wifi,
  WifiOff,
  Signal,
  SignalZero,
  SignalLow,
  SignalMedium,
  SignalHigh,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Power,
  PowerOff,
  Activity,
  Pause,
  Heart,
  HeartHandshake,
  User,
  UserMinus2,
  UserCog2,
  Users2,
  Search,
  Shield,
  Star,
  UserX2,
  UserCheck2,
  UserPlus2,
  Settings as UserEdit,
  Search as UserSearch,
  UserCog as UserShield,
  Star as UserStar,
  User as UserTie9,
  UserX,
  UserCheck,
  UserPlus,
  UserMinus,
  UserCog,
  Settings as UserEdit10,
  Search as UserSearch10,
  Shield as UserShield10,
  Star as UserStar10,
  User as UserTie10
} from 'lucide-react'
import { Milestone, Task, TimeEntry, Comment, BookingProgress, UserRole } from '@/types/progress'
import { formatDistanceToNow, isAfter, isBefore, addDays, differenceInDays } from 'date-fns'
import { safeFormatDate, safeFormatDistanceToNow } from '@/lib/date-utils'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useProgressTracking } from '@/hooks/use-progress-tracking'
import { EnhancedMilestoneManagement } from './enhanced-milestone-management'
import { EnhancedSmartSuggestions } from './enhanced-smart-suggestions'
import { EnhancedTaskManagement } from './enhanced-task-management'
import { ProgressAnalytics } from './progress-analytics'

interface EnhancedProgressTrackingProps {
  bookingId: string
  userRole: UserRole
  className?: string
}

export function EnhancedProgressTracking({ 
  bookingId, 
  userRole, 
  className = "" 
}: EnhancedProgressTrackingProps) {
  
  // State management
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [bookingProgress, setBookingProgress] = useState<BookingProgress | null>(null)
  const [overallProgress, setOverallProgress] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [completedTasks, setCompletedTasks] = useState(0)
  const [totalEstimatedHours, setTotalEstimatedHours] = useState(0)
  const [totalActualHours, setTotalActualHours] = useState(0)
  const [overdueTasks, setOverdueTasks] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'milestones' | 'tasks' | 'analytics' | 'timeline'>('overview')
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)
  const [showCreateMilestone, setShowCreateMilestone] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'progress' | 'title'>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showCompleted, setShowCompleted] = useState(true)
  const [compactView, setCompactView] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30000) // 30 seconds

  // Use the progress tracking hook
  const {
    isUpdating,
    updateTaskProgress,
    updateMilestoneProgress,
    addTask,
    deleteTask,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addComment,
    requestMilestoneApproval,
    approveMilestone,
    rejectMilestone,
    logTime,
    refreshData
  } = useProgressTracking({
    bookingId,
    onProgressUpdate: (updates: any) => {
      setOverallProgress(updates.overallProgress)
      setBookingProgress(prev => prev ? {
        ...prev,
        booking_progress: updates.overallProgress
      } : null)
    }
  })

  // Load data on mount
  useEffect(() => {
    if (bookingId) {
      loadData()
    }
  }, [bookingId])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshData])

  // Load all data from database
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load progress data
      const progressData = await refreshData()
      setMilestones(progressData.milestones || [])
      setTimeEntries(progressData.timeEntries || [])
      setComments(progressData.comments || [])
      setBookingProgress(progressData.bookingProgress)
      setOverallProgress(progressData.overallProgress || 0)
      setTotalTasks(progressData.totalTasks || 0)
      setCompletedTasks(progressData.completedTasks || 0)
      setTotalEstimatedHours(progressData.totalEstimatedHours || 0)
      setTotalActualHours(progressData.totalActualHours || 0)
      setOverdueTasks(progressData.overdueTasks || 0)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress data')
      toast.error('Failed to load progress data')
    } finally {
      setLoading(false)
    }
  }, [refreshData])

  // Handle milestone operations
  const handleMilestoneUpdate = async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      await updateMilestone(milestoneId, updates)
      await loadData()
      toast.success('Milestone updated successfully')
    } catch (error) {
      console.error('Error updating milestone:', error)
      toast.error('Failed to update milestone')
    }
  }

  const handleMilestoneCreate = async (milestoneData: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'progress' | 'tasks'>) => {
    try {
      await addMilestone(milestoneData)
      await loadData()
      toast.success('Milestone created successfully')
      setShowCreateMilestone(false)
    } catch (error) {
      console.error('Error creating milestone:', error)
      toast.error('Failed to create milestone')
    }
  }

  const handleMilestoneDelete = async (milestoneId: string) => {
    try {
      await deleteMilestone(milestoneId)
      await loadData()
      toast.success('Milestone deleted successfully')
    } catch (error) {
      console.error('Error deleting milestone:', error)
      toast.error('Failed to delete milestone')
    }
  }

  // Handle task operations
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTaskProgress(taskId, updates)
      await loadData()
      toast.success('Task updated successfully')
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleTaskCreate = async (milestoneId: string, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => {
    try {
      await addTask(milestoneId, taskData)
      await loadData()
      toast.success('Task created successfully')
      setShowCreateTask(false)
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      await loadData()
      toast.success('Task deleted successfully')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }

  // Handle comment operations
  const handleCommentAdd = async (milestoneId: string, content: string) => {
    try {
      await addComment(milestoneId, content)
      await loadData()
      toast.success('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  // Handle milestone approval
  const handleMilestoneApproval = async (milestoneId: string, approved: boolean, comment?: string) => {
    try {
      if (approved) {
        await approveMilestone(milestoneId, comment)
        toast.success('Milestone approved')
      } else {
        await rejectMilestone(milestoneId, comment)
        toast.success('Milestone rejected')
      }
      await loadData()
    } catch (error) {
      console.error('Error handling milestone approval:', error)
      toast.error('Failed to process milestone approval')
    }
  }

  // Handle time logging
  const handleTimeLog = async (taskId: string, duration: number, description: string) => {
    try {
      await logTime(taskId, duration, description)
      await loadData()
      toast.success('Time logged successfully')
    } catch (error) {
      console.error('Error logging time:', error)
      toast.error('Failed to log time')
    }
  }

  // Filter and sort milestones
  const filteredMilestones = milestones
    .filter(milestone => {
      if (filterStatus !== 'all' && milestone.status !== filterStatus) return false
      if (filterPriority !== 'all' && milestone.priority !== filterPriority) return false
      if (searchQuery && !milestone.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (!showCompleted && milestone.status === 'completed') return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'due_date':
          comparison = new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0)
          break
        case 'progress':
          comparison = a.progress - b.progress
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Calculate statistics
  const stats = {
    totalMilestones: milestones.length,
    completedMilestones: milestones.filter(m => m.status === 'completed').length,
    inProgressMilestones: milestones.filter(m => m.status === 'in_progress').length,
    overdueMilestones: milestones.filter(m => m.is_overdue).length,
    totalTasks: totalTasks,
    completedTasks: completedTasks,
    overdueTasks: overdueTasks,
    totalEstimatedHours: totalEstimatedHours,
    totalActualHours: totalActualHours,
    progressPercentage: overallProgress
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading progress data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Error loading progress data: {error}</span>
          </div>
          <Button 
            onClick={loadData} 
            variant="outline" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-6 w-6 text-blue-600" />
                <span>Project Progress</span>
                <Badge variant="outline" className="ml-2">
                  {stats.progressPercentage}% Complete
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {stats.completedMilestones} of {stats.totalMilestones} milestones completed
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRefreshing(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {userRole === 'provider' && (
                <Button
                  onClick={() => setShowCreateMilestone(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.progressPercentage}%</div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
              <div className="text-sm text-gray-600">Tasks Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.overdueTasks}</div>
              <div className="text-sm text-gray-600">Overdue Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalActualHours}h</div>
              <div className="text-sm text-gray-600">Time Logged</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Project Progress</span>
              <span>{stats.progressPercentage}%</span>
            </div>
            <Progress value={stats.progressPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Milestones List */}
            <div className="lg:col-span-2">
              <EnhancedMilestoneManagement
                milestones={filteredMilestones}
                userRole={userRole}
                onMilestoneUpdate={handleMilestoneUpdate}
                onMilestoneCreate={handleMilestoneCreate}
                onMilestoneDelete={handleMilestoneDelete}
                onTaskUpdate={handleTaskUpdate}
                onTaskCreate={handleTaskCreate}
                onTaskDelete={handleTaskDelete}
                onCommentAdd={handleCommentAdd}
                onTimeLog={handleTimeLog}
                onMilestoneApproval={handleMilestoneApproval}
                expandedMilestones={expandedMilestones}
                onToggleExpanded={setExpandedMilestones}
                selectedMilestone={selectedMilestone}
                onSelectMilestone={setSelectedMilestone}
                showCreateMilestone={showCreateMilestone}
                onShowCreateMilestone={setShowCreateMilestone}
                showCreateTask={showCreateTask}
                onShowCreateTask={setShowCreateTask}
                compactView={compactView}
                onToggleCompactView={setCompactView}
              />
            </div>

            {/* Smart Suggestions Sidebar */}
            <div className="lg:col-span-1">
              <EnhancedSmartSuggestions
                milestones={milestones}
                bookingProgress={bookingProgress}
                timeEntries={timeEntries}
                userRole={userRole}
                onRefresh={loadData}
                onMilestoneApproval={handleMilestoneApproval}
                onTaskUpdate={handleTaskUpdate}
                onCommentAdd={handleCommentAdd}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <EnhancedMilestoneManagement
            milestones={filteredMilestones}
            userRole={userRole}
            onMilestoneUpdate={handleMilestoneUpdate}
            onMilestoneCreate={handleMilestoneCreate}
            onMilestoneDelete={handleMilestoneDelete}
            onTaskUpdate={handleTaskUpdate}
            onTaskCreate={handleTaskCreate}
            onTaskDelete={handleTaskDelete}
            onCommentAdd={handleCommentAdd}
            onTimeLog={handleTimeLog}
            onMilestoneApproval={handleMilestoneApproval}
            expandedMilestones={expandedMilestones}
            onToggleExpanded={setExpandedMilestones}
            selectedMilestone={selectedMilestone}
            onSelectMilestone={setSelectedMilestone}
            showCreateMilestone={showCreateMilestone}
            onShowCreateMilestone={setShowCreateMilestone}
            showCreateTask={showCreateTask}
            onShowCreateTask={setShowCreateTask}
            compactView={compactView}
            onToggleCompactView={setCompactView}
            fullWidth={true}
          />
        </TabsContent>
        <TabsContent value="tasks" className="space-y-6">
          <EnhancedTaskManagement
            milestones={milestones}
            userRole={userRole}
            onTaskUpdate={handleTaskUpdate}
            onTaskCreate={handleTaskCreate}
            onTaskDelete={handleTaskDelete}
            onTimeLog={handleTimeLog}
            onCommentAdd={handleCommentAdd}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            filterPriority={filterPriority}
            onFilterPriorityChange={setFilterPriority}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            showCompleted={showCompleted}
            onShowCompletedChange={setShowCompleted}
            compactView={compactView}
            onToggleCompactView={setCompactView}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <ProgressAnalytics
            milestones={milestones}
            timeEntries={timeEntries}
            stats={stats}
            userRole={userRole}
          />
        </TabsContent>
        <TabsContent value="timeline" className="space-y-6">
          <div className="text-muted-foreground">
            Timeline view coming soon...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
