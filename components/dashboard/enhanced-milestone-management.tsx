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
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { EnhancedTaskManagement } from './enhanced-task-management'

interface EnhancedMilestoneManagementProps {
  milestones: Milestone[]
  userRole: UserRole
  onMilestoneUpdate: (milestoneId: string, updates: Partial<Milestone>) => Promise<void>
  onMilestoneCreate: (milestoneData: Omit<Milestone, 'id' | 'created_at' | 'updated_at' | 'progress' | 'tasks'>) => Promise<void>
  onMilestoneDelete: (milestoneId: string) => Promise<void>
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>
  onTaskCreate: (milestoneId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_overdue' | 'actual_hours'>) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
  onCommentAdd: (milestoneId: string, content: string) => Promise<void>
  onTimeLog: (taskId: string, duration: number, description: string) => Promise<void>
  onMilestoneApproval: (milestoneId: string, approved: boolean, comment?: string) => Promise<void>
  expandedMilestones: Set<string>
  onToggleExpanded: (milestones: Set<string>) => void
  selectedMilestone: string | null
  onSelectMilestone: (milestoneId: string | null) => void
  showCreateMilestone: boolean
  onShowCreateMilestone: (show: boolean) => void
  showCreateTask: boolean
  onShowCreateTask: (show: boolean) => void
  compactView: boolean
  onToggleCompactView: (compact: boolean) => void
  fullWidth?: boolean
}

export function EnhancedMilestoneManagement({
  milestones,
  userRole,
  onMilestoneUpdate,
  onMilestoneCreate,
  onMilestoneDelete,
  onTaskUpdate,
  onTaskCreate,
  onTaskDelete,
  onCommentAdd,
  onTimeLog,
  onMilestoneApproval,
  expandedMilestones,
  onToggleExpanded,
  selectedMilestone,
  onSelectMilestone,
  showCreateMilestone,
  onShowCreateMilestone,
  showCreateTask,
  onShowCreateTask,
  compactView,
  onToggleCompactView,
  fullWidth = false
}: EnhancedMilestoneManagementProps) {
  
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null)
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    estimated_hours: 0
  })
  const [showAttachments, setShowAttachments] = useState<Record<string, boolean>>({})
  const [attachments, setAttachments] = useState<Record<string, any[]>>({})
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [newComment, setNewComment] = useState<Record<string, string>>({})
  const [draggedMilestone, setDraggedMilestone] = useState<string | null>(null)

  // Handle milestone creation
  const handleCreateMilestone = async () => {
    if (!newMilestone.title.trim()) {
      toast.error('Milestone title is required')
      return
    }

    try {
      await onMilestoneCreate({
        booking_id: '', // This will be set by the parent component
        title: newMilestone.title.trim(),
        description: newMilestone.description.trim() || undefined,
        due_date: newMilestone.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        priority: newMilestone.priority,
        estimated_hours: newMilestone.estimated_hours,
        weight: 1.0,
        order_index: milestones.length,
        is_overdue: false
      })

      setNewMilestone({
        title: '',
        description: '',
        due_date: '',
        priority: 'normal',
        estimated_hours: 0
      })
      onShowCreateMilestone(false)
    } catch (error) {
      console.error('Error creating milestone:', error)
    }
  }

  // Handle milestone status change
  const handleStatusChange = async (milestoneId: string, status: string) => {
    try {
      await onMilestoneUpdate(milestoneId, { 
        status: status as any,
        ...(status === 'completed' && { completed_at: new Date().toISOString() })
      })
    } catch (error) {
      console.error('Error updating milestone status:', error)
    }
  }

  // Handle milestone priority change
  const handlePriorityChange = async (milestoneId: string, priority: string) => {
    try {
      await onMilestoneUpdate(milestoneId, { priority: priority as any })
    } catch (error) {
      console.error('Error updating milestone priority:', error)
    }
  }

  // Handle milestone progress change
  const handleProgressChange = async (milestoneId: string, progress: number) => {
    try {
      await onMilestoneUpdate(milestoneId, { progress })
    } catch (error) {
      console.error('Error updating milestone progress:', error)
    }
  }

  // Handle milestone editing
  const handleEditMilestone = async (milestoneId: string, updates: Partial<Milestone>) => {
    try {
      await onMilestoneUpdate(milestoneId, updates)
      setEditingMilestone(null)
    } catch (error) {
      console.error('Error updating milestone:', error)
    }
  }

  // Handle milestone deletion
  const handleDeleteMilestone = async (milestoneId: string) => {
    if (confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) {
      try {
        await onMilestoneDelete(milestoneId)
      } catch (error) {
        console.error('Error deleting milestone:', error)
      }
    }
  }

  // Handle comment submission
  const handleCommentSubmit = async (milestoneId: string) => {
    const content = newComment[milestoneId]?.trim()
    if (!content) return

    try {
      await onCommentAdd(milestoneId, content)
      setNewComment(prev => ({ ...prev, [milestoneId]: '' }))
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  // Handle milestone approval request
  const handleApprovalRequest = async (milestoneId: string) => {
    try {
      await onMilestoneApproval(milestoneId, true)
    } catch (error) {
      console.error('Error requesting milestone approval:', error)
    }
  }

  // Handle milestone approval/rejection
  const handleApproval = async (milestoneId: string, approved: boolean) => {
    try {
      await onMilestoneApproval(milestoneId, approved)
    } catch (error) {
      console.error('Error handling milestone approval:', error)
    }
  }

  // Toggle milestone expansion
  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    onToggleExpanded(newExpanded)
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

  // Calculate milestone progress
  const calculateMilestoneProgress = (milestone: Milestone) => {
    if (milestone.tasks.length === 0) return milestone.progress || 0
    
    const completedTasks = milestone.tasks.filter(task => task.status === 'completed').length
    return Math.round((completedTasks / milestone.tasks.length) * 100)
  }

  // Check if milestone is overdue
  const isOverdue = (milestone: Milestone) => {
    if (milestone.status === 'completed') return false
    return milestone.due_date && isBefore(new Date(milestone.due_date), new Date())
  }

  // Get trend indicator
  const getTrendIndicator = (milestone: Milestone) => {
    const progress = calculateMilestoneProgress(milestone)
    const now = new Date()
    const startDate = new Date(milestone.due_date)
    const endDate = new Date(milestone.due_date)
    const totalDays = differenceInDays(endDate, startDate)
    const elapsedDays = differenceInDays(now, startDate)
    const expectedProgress = Math.min(Math.round((elapsedDays / totalDays) * 100), 100)

    if (progress >= expectedProgress + 20) return { text: 'Ahead of schedule! 🚀', color: 'text-green-600' }
    if (progress <= expectedProgress - 20) return { text: 'Behind schedule! 📈', color: 'text-red-600' }
    if (progress > 80) return { text: 'Almost done! 💪', color: 'text-blue-600' }
    if (isOverdue(milestone)) return { text: 'Overdue! ⚠️', color: 'text-red-600' }
    return { text: 'On track! ✅', color: 'text-green-600' }
  }

  return (
    <div className={`space-y-4 ${fullWidth ? 'w-full' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Milestones</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleCompactView(!compactView)}
          >
            {compactView ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          {userRole === 'provider' && (
            <Button
              onClick={() => onShowCreateMilestone(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          )}
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        <AnimatePresence>
          {milestones.map((milestone) => {
            const isExpanded = expandedMilestones.has(milestone.id)
            const isSelected = selectedMilestone === milestone.id
            const progress = calculateMilestoneProgress(milestone)
            const trend = getTrendIndicator(milestone)
            const overdue = isOverdue(milestone)

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                } ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMilestone(milestone.id)}
                            className="p-1 h-6 w-6"
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                          <CardTitle className="text-base font-medium text-gray-900">
                            {milestone.title}
                          </CardTitle>
                          <Badge className={getStatusColor(milestone.status)}>
                            {getStatusIcon(milestone.status)}
                            <span className="ml-1 capitalize">{milestone.status.replace('_', ' ')}</span>
                          </Badge>
                          <Badge className={getPriorityColor(milestone.priority || 'normal')}>
                            {getPriorityIcon(milestone.priority || 'normal')}
                            <span className="ml-1 capitalize">{milestone.priority || 'normal'}</span>
                          </Badge>
                          {overdue && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                        
                        {milestone.description && (
                          <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {safeFormatDate(milestone.due_date)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Timer className="h-4 w-4" />
                            <span>{milestone.estimated_hours || 0}h estimated</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-4 w-4" />
                            <span>{milestone.tasks.length} tasks</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{progress}%</div>
                          <div className="text-xs text-gray-500">Progress</div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          {userRole === 'provider' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingMilestone(milestone.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMilestone(milestone.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectMilestone(isSelected ? null : milestone.id)}
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
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
                        <span>{milestone.tasks.filter(t => t.status === 'completed').length} of {milestone.tasks.length} tasks completed</span>
                        <span className={trend.color}>{trend.text}</span>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="pt-0">
                          {/* Tasks Section */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">Tasks ({milestone.tasks.length})</h4>
                              {userRole === 'provider' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onShowCreateTask(true)}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Task
                                </Button>
                              )}
                            </div>

                            {milestone.tasks.length > 0 ? (
                              <EnhancedTaskManagement
                                milestones={[milestone]}
                                userRole={userRole}
                                onTaskUpdate={onTaskUpdate}
                                onTaskCreate={onTaskCreate}
                                onTaskDelete={onTaskDelete}
                                onTimeLog={onTimeLog}
                                onCommentAdd={onCommentAdd}
                                compactView={true}
                                onToggleCompactView={() => {}}
                                showCreateButton={false}
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No tasks yet</p>
                                {userRole === 'provider' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onShowCreateTask(true)}
                                    className="mt-2"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First Task
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Attachments Section */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">Attachments</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAttachments(prev => ({ ...prev, [milestone.id]: !prev[milestone.id] }))}
                              >
                                {showAttachments[milestone.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </div>
                            
                            {showAttachments[milestone.id] && (
                              <div className="space-y-2">
                                {attachments[milestone.id]?.length > 0 ? (
                                  <div className="space-y-2">
                                    {attachments[milestone.id].map((attachment, index) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div className="flex items-center space-x-2">
                                          <FileText className="h-4 w-4 text-gray-500" />
                                          <span className="text-sm text-gray-700">{attachment.name}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                            <Download className="h-3 w-3" />
                                          </Button>
                                          {userRole === 'provider' && (
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600">
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-500">
                                    <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">No attachments</p>
                                  </div>
                                )}
                                
                                {userRole === 'provider' && (
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      type="file"
                                      className="flex-1"
                                      multiple
                                    />
                                    <Button size="sm">
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Comments Section */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900">Comments</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowComments(prev => ({ ...prev, [milestone.id]: !prev[milestone.id] }))}
                              >
                                {showComments[milestone.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </div>
                            
                            {showComments[milestone.id] && (
                              <div className="space-y-2">
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Add a comment..."
                                    value={newComment[milestone.id] || ''}
                                    onChange={(e) => setNewComment(prev => ({ ...prev, [milestone.id]: e.target.value }))}
                                    className="min-h-[80px]"
                                  />
                                  <div className="flex justify-end">
                                    <Button
                                      size="sm"
                                      onClick={() => handleCommentSubmit(milestone.id)}
                                      disabled={!newComment[milestone.id]?.trim()}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Comment
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center space-x-2">
                              {milestone.status === 'completed' ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange(milestone.id, 'in_progress')}
                                  >
                                    <Play className="h-4 w-4 mr-2" />
                                    Start
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange(milestone.id, 'completed')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Complete
                                  </Button>
                                </div>
                              )}
                            </div>

                            {userRole === 'client' && milestone.status === 'completed' && (
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApproval(milestone.id, true)}
                                >
                                  <ThumbsUp className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApproval(milestone.id, false)}
                                >
                                  <ThumbsDown className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Create Milestone Dialog */}
      <Dialog open={showCreateMilestone} onOpenChange={onShowCreateMilestone}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Milestone</DialogTitle>
            <DialogDescription>
              Add a new milestone to track project progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <Input
                value={newMilestone.title}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter milestone title"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter milestone description"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <Input
                  type="date"
                  value={newMilestone.due_date}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">End Date</label>
                <Input
                  type="date"
                  value={newMilestone.due_date}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select
                  value={newMilestone.priority}
                  onValueChange={(value) => setNewMilestone(prev => ({ ...prev, priority: value as any }))}
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
                  value={newMilestone.estimated_hours}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, estimated_hours: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => onShowCreateMilestone(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateMilestone}>
                Create Milestone
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
