'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Pause,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  Timer,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  Star,
  Target,
  TrendingUp,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Filter,
  Search,
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
  Shield,
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
  Heart,
  UserCheck,
  UserX,
  UserPlus,
  UserMinus,
  Users2,
  UserCog
} from 'lucide-react'
import { Milestone, Task, UserRole } from '@/types/progress'
import { formatDistanceToNow, isAfter, isBefore, addDays, differenceInDays } from 'date-fns'
import { safeFormatDate, safeFormatDistanceToNow } from '@/lib/date-utils'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

interface EnhancedTaskManagementProps {
  milestones: Milestone[]
  userRole: UserRole
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskCreate: (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
  onTimeLog: (taskId: string, duration: number, description: string) => Promise<void>
  onCommentAdd: (milestoneId: string, content: string) => Promise<void>
  filterStatus?: 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'
  onFilterStatusChange?: (status: 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue') => void
  filterPriority?: 'all' | 'low' | 'medium' | 'high' | 'urgent'
  onFilterPriorityChange?: (priority: 'all' | 'low' | 'medium' | 'high' | 'urgent') => void
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  sortBy?: 'due_date' | 'priority' | 'progress' | 'title'
  onSortByChange?: (sortBy: 'due_date' | 'priority' | 'progress' | 'title') => void
  sortOrder?: 'asc' | 'desc'
  onSortOrderChange?: (order: 'asc' | 'desc') => void
  showCompleted?: boolean
  onShowCompletedChange?: (show: boolean) => void
  compactView?: boolean
  onToggleCompactView?: (compact: boolean) => void
  showCreateButton?: boolean
}

export function EnhancedTaskManagement({
  milestones,
  userRole,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onTimeLog,
  onCommentAdd,
  filterStatus = 'all',
  onFilterStatusChange,
  filterPriority = 'all',
  onFilterPriorityChange,
  searchQuery = '',
  onSearchQueryChange,
  sortBy = 'due_date',
  onSortByChange,
  sortOrder = 'asc',
  onSortOrderChange,
  showCompleted = true,
  onShowCompletedChange,
  compactView = false,
  onToggleCompactView,
  showCreateButton = true
}: EnhancedTaskManagementProps) {
  
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    estimated_hours: 0,
    due_date: '',
    tags: [] as string[],
    assigned_to: ''
  })
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)
  const [showTimeLog, setShowTimeLog] = useState<Record<string, boolean>>({})
  const [timeLogData, setTimeLogData] = useState<Record<string, { duration: number; description: string }>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [showAttachments, setShowAttachments] = useState<Record<string, boolean>>({})
  const [attachments, setAttachments] = useState<Record<string, any[]>>({})

  // Get all tasks from all milestones
  const allTasks = milestones.flatMap(milestone => 
    milestone.tasks.map(task => ({ ...task, milestone_title: milestone.title, milestone_id: milestone.id }))
  )

  // Filter and sort tasks
  const filteredTasks = allTasks
    .filter(task => {
      if (filterStatus !== 'all' && task.status !== filterStatus) return false
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (!showCompleted && task.status === 'completed') return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'due_date':
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0
          comparison = aDate - bDate
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) - 
                      (priorityOrder[b.priority as keyof typeof priorityOrder] || 0)
          break
        case 'progress':
          comparison = (a.progress || 0) - (b.progress || 0)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Handle task creation
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Task title is required')
      return
    }

    if (!selectedMilestone) {
      toast.error('Please select a milestone')
      return
    }

    try {
      await onTaskCreate(selectedMilestone, {
        milestone_id: selectedMilestone,
        title: newTask.title.trim(),
        description: newTask.description.trim() || undefined,
        priority: newTask.priority,
        estimated_hours: newTask.estimated_hours,
        due_date: newTask.due_date || undefined,
        status: 'pending',
        progress: 0,
        tags: newTask.tags,
        assigned_to: newTask.assigned_to || undefined,
        order_index: 0
      })

      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        estimated_hours: 0,
        due_date: '',
        tags: [],
        assigned_to: ''
      })
      setSelectedMilestone(null)
      setShowCreateTask(false)
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  // Handle task status change
  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await onTaskUpdate(taskId, { 
        status: status as any,
        ...(status === 'completed' && { completed_at: new Date().toISOString() })
      })
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  // Handle task priority change
  const handlePriorityChange = async (taskId: string, priority: string) => {
    try {
      await onTaskUpdate(taskId, { priority: priority as any })
    } catch (error) {
      console.error('Error updating task priority:', error)
    }
  }

  // Handle task progress change
  const handleProgressChange = async (taskId: string, progress: number) => {
    try {
      await onTaskUpdate(taskId, { progress })
    } catch (error) {
      console.error('Error updating task progress:', error)
    }
  }

  // Handle task editing
  const handleEditTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await onTaskUpdate(taskId, updates)
      setEditingTask(null)
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      try {
        await onTaskDelete(taskId)
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    }
  }

  // Handle time logging
  const handleTimeLogSubmit = async (taskId: string) => {
    const data = timeLogData[taskId]
    if (!data || data.duration <= 0) return

    try {
      await onTimeLog(taskId, data.duration, data.description)
      setTimeLogData(prev => ({ ...prev, [taskId]: { duration: 0, description: '' } }))
      setShowTimeLog(prev => ({ ...prev, [taskId]: false }))
    } catch (error) {
      console.error('Error logging time:', error)
    }
  }

  // Handle comment submission
  const handleCommentSubmit = async (taskId: string) => {
    const content = newComment[taskId]?.trim()
    if (!content) return

    try {
      // Find the milestone for this task
      const task = allTasks.find(t => t.id === taskId)
      if (task) {
        await onCommentAdd(task.milestone_id, content)
        setNewComment(prev => ({ ...prev, [taskId]: '' }))
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'on_hold': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'in_progress': return <Play className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      case 'on_hold': return <Pause className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <Flag className="h-4 w-4" />
      case 'medium': return <Target className="h-4 w-4" />
      case 'low': return <Star className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  // Check if task is overdue
  const isOverdue = (task: Task) => {
    if (task.status === 'completed') return false
    return task.due_date && isBefore(new Date(task.due_date), new Date())
  }

  // Get trend indicator
  const getTrendIndicator = (task: Task) => {
    const progress = task.progress || 0
    const now = new Date()
    const dueDate = task.due_date ? new Date(task.due_date) : null
    const createdDate = new Date(task.created_at)
    
    if (!dueDate) return { text: 'No due date', color: 'text-gray-500' }
    
    const totalDays = differenceInDays(dueDate, createdDate)
    const elapsedDays = differenceInDays(now, createdDate)
    const expectedProgress = Math.min(Math.round((elapsedDays / totalDays) * 100), 100)

    if (progress >= expectedProgress + 20) return { text: 'Ahead of schedule! 🚀', color: 'text-green-600' }
    if (progress <= expectedProgress - 20) return { text: 'Behind schedule! 📈', color: 'text-red-600' }
    if (progress > 80) return { text: 'Almost done! 💪', color: 'text-blue-600' }
    if (isOverdue(task)) return { text: 'Overdue! ⚠️', color: 'text-red-600' }
    return { text: 'On track! ✅', color: 'text-green-600' }
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      {!compactView && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Tasks</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleCompactView?.(!compactView)}
                >
                  {compactView ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                {showCreateButton && userRole === 'provider' && (
                  <Button
                    onClick={() => setShowCreateTask(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={filterStatus} onValueChange={onFilterStatusChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select value={filterPriority} onValueChange={onFilterPriorityChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Sort By</label>
                <Select value={sortBy} onValueChange={onSortByChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_date">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="progress">Progress</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Search</label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange?.(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => onShowCompletedChange?.(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Show completed</span>
                </label>
              </div>
              <div className="text-sm text-gray-500">
                {filteredTasks.length} of {allTasks.length} tasks
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredTasks.map((task) => {
            const isEditing = editingTask === task.id
            const overdue = isOverdue(task)
            const trend = getTrendIndicator(task)
            const progress = task.progress || 0

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`transition-all duration-200 ${
                  overdue ? 'border-red-200 bg-red-50' : 'hover:shadow-md'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                            className="p-1 h-6 w-6"
                          >
                            {task.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
                            )}
                          </Button>
                          <div className="flex-1">
                            {isEditing ? (
                              <Input
                                value={task.title}
                                onChange={(e) => handleEditTask(task.id, { title: e.target.value })}
                                className="font-medium"
                                onBlur={() => setEditingTask(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setEditingTask(null)
                                }}
                                autoFocus
                              />
                            ) : (
                              <h4 
                                className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                                onClick={() => setEditingTask(task.id)}
                              >
                                {task.title}
                              </h4>
                            )}
                          </div>
                          <Badge className={getStatusColor(task.status)}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1 capitalize">{task.status.replace('_', ' ')}</span>
                          </Badge>
                          <Badge className={getPriorityColor(task.priority || 'medium')}>
                            {getPriorityIcon(task.priority || 'medium')}
                            <span className="ml-1 capitalize">{task.priority || 'medium'}</span>
                          </Badge>
                          {overdue && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {task.due_date ? safeFormatDate(task.due_date) : 'No due date'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Timer className="h-4 w-4" />
                            <span>{task.estimated_hours || 0}h estimated</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{task.assigned_to || 'Unassigned'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-4 w-4" />
                            <span>{task.milestone_title}</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Progress</span>
                            <span>{progress}% Complete</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{task.actual_hours || 0}h logged</span>
                            <span className={trend.color}>{trend.text}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Hash className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">{progress}%</div>
                          <div className="text-xs text-gray-500">Progress</div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          {userRole === 'provider' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingTask(task.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowTimeLog(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                            className="h-8 w-8 p-0"
                          >
                            <Timer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowComments(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                            className="h-8 w-8 p-0"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Time Log Section */}
                    <AnimatePresence>
                      {showTimeLog[task.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 p-3 bg-gray-50 rounded"
                        >
                          <h5 className="font-medium text-gray-900 mb-2">Log Time</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              placeholder="Hours"
                              value={timeLogData[task.id]?.duration || ''}
                              onChange={(e) => setTimeLogData(prev => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], duration: parseInt(e.target.value) || 0 }
                              }))}
                            />
                            <Input
                              placeholder="Description"
                              value={timeLogData[task.id]?.description || ''}
                              onChange={(e) => setTimeLogData(prev => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], description: e.target.value }
                              }))}
                            />
                          </div>
                          <div className="flex justify-end space-x-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowTimeLog(prev => ({ ...prev, [task.id]: false }))}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleTimeLogSubmit(task.id)}
                              disabled={!timeLogData[task.id]?.duration || timeLogData[task.id].duration <= 0}
                            >
                              Log Time
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Comments Section */}
                    <AnimatePresence>
                      {showComments[task.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-4 p-3 bg-gray-50 rounded"
                        >
                          <h5 className="font-medium text-gray-900 mb-2">Comments</h5>
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Add a comment..."
                              value={newComment[task.id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [task.id]: e.target.value }))}
                              className="min-h-[60px]"
                            />
                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleCommentSubmit(task.id)}
                                disabled={!newComment[task.id]?.trim()}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Comment
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to track progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Milestone</label>
              <Select value={selectedMilestone || ''} onValueChange={setSelectedMilestone}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a milestone" />
                </SelectTrigger>
                <SelectContent>
                  {milestones.map(milestone => (
                    <SelectItem key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask(prev => ({ ...prev, priority: value as any }))}
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
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Due Date</label>
                <Input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned To</label>
                <Input
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                  placeholder="Enter assignee"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateTask(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
