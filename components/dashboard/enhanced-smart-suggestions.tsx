'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertCircle, 
  Clock, 
  MessageSquare, 
  CreditCard, 
  CheckCircle,
  X,
  RefreshCw,
  Lightbulb,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  Timer,
  User,
  FileText,
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
  Plus,
  Minus,
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
import { Milestone, BookingProgress, TimeEntry, UserRole } from '@/types/progress'
import { isAfter, isBefore, addDays, differenceInDays } from 'date-fns'
import { safeFormatDate, safeFormatDistanceToNow } from '@/lib/date-utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface SmartSuggestion {
  id: string
  type: 'overdue' | 'inactive' | 'payment' | 'follow_up' | 'milestone_approval' | 'task_due' | 'progress_slow' | 'time_tracking' | 'communication' | 'ai_suggestion'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  title: string
  description: string
  action: string
  data?: any
  dismissible: boolean
  category: 'urgent' | 'warning' | 'info' | 'success'
  estimatedTime?: string
  impact?: 'low' | 'medium' | 'high'
}

interface EnhancedSmartSuggestionsProps {
  milestones: Milestone[]
  bookingProgress: BookingProgress | null
  timeEntries: TimeEntry[]
  userRole: UserRole
  onRefresh: () => void
  onMilestoneApproval: (milestoneId: string, approved: boolean, comment?: string) => Promise<void>
  onTaskUpdate: (taskId: string, updates: Partial<any>) => Promise<void>
  onCommentAdd: (milestoneId: string, content: string) => Promise<void>
}

export function EnhancedSmartSuggestions({
  milestones,
  bookingProgress,
  timeEntries,
  userRole,
  onRefresh,
  onMilestoneApproval,
  onTaskUpdate,
  onCommentAdd
}: EnhancedSmartSuggestionsProps) {
  
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(true)

  // Generate suggestions based on real data
  useEffect(() => {
    const generateSuggestions = (): SmartSuggestion[] => {
      const newSuggestions: SmartSuggestion[] = []
      const now = new Date()

      // Check for overdue milestones
      const overdueMilestones = milestones.filter(m => 
        m.due_date && 
        isBefore(new Date(m.due_date), now) && 
        m.status !== 'completed'
      )

      overdueMilestones.forEach(milestone => {
        newSuggestions.push({
          id: `overdue-${milestone.id}`,
          type: 'overdue',
          priority: 'urgent',
          title: 'Overdue Milestone',
          description: `"${milestone.title}" was due ${safeFormatDistanceToNow(milestone.due_date, { addSuffix: true })}`,
          action: 'Follow up with client',
          data: { milestoneId: milestone.id },
          dismissible: true,
          category: 'urgent',
          estimatedTime: '5 min',
          impact: 'high'
        })
      })

      // Check for tasks due today
      const tasksDueToday = milestones.flatMap(m => 
        m.tasks.filter(task => 
          task.due_date && 
          isAfter(new Date(task.due_date), now) &&
          isBefore(new Date(task.due_date), addDays(now, 1)) &&
          task.status !== 'completed'
        )
      )

      if (tasksDueToday.length > 0) {
        newSuggestions.push({
          id: 'tasks-due-today',
          type: 'task_due',
          priority: 'high',
          title: 'Tasks Due Today',
          description: `${tasksDueToday.length} task${tasksDueToday.length > 1 ? 's' : ''} due today`,
          action: 'Review and prioritize',
          data: { taskIds: tasksDueToday.map(t => t.id) },
          dismissible: true,
          category: 'warning',
          estimatedTime: '10 min',
          impact: 'medium'
        })
      }

      // Check for inactive milestones (no updates in 2+ days)
      const inactiveMilestones = milestones.filter(m => {
        if (m.status === 'completed') return false
        const lastUpdate = new Date(m.updated_at)
        const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceUpdate >= 2
      })

      inactiveMilestones.forEach(milestone => {
        newSuggestions.push({
          id: `inactive-${milestone.id}`,
          type: 'inactive',
          priority: 'normal',
          title: 'Inactive Milestone',
          description: `"${milestone.title}" hasn't been updated in ${Math.floor((now.getTime() - new Date(milestone.updated_at).getTime()) / (1000 * 60 * 60 * 24))} days`,
          action: 'Update progress',
          data: { milestoneId: milestone.id },
          dismissible: true,
          category: 'warning',
          estimatedTime: '3 min',
          impact: 'medium'
        })
      })

      // Check for slow progress
      const slowProgressMilestones = milestones.filter(m => {
        if (m.status === 'completed') return false
        const progress = m.progress || 0
        const startDate = new Date(m.created_at)
        const endDate = new Date(m.due_date)
        const totalDays = differenceInDays(endDate, startDate)
        const elapsedDays = differenceInDays(now, startDate)
        const expectedProgress = Math.min(Math.round((elapsedDays / totalDays) * 100), 100)
        return progress < expectedProgress - 20
      })

      slowProgressMilestones.forEach(milestone => {
        newSuggestions.push({
          id: `slow-progress-${milestone.id}`,
          type: 'progress_slow',
          priority: 'normal',
          title: 'Slow Progress',
          description: `"${milestone.title}" is behind schedule`,
          action: 'Review and adjust timeline',
          data: { milestoneId: milestone.id },
          dismissible: true,
          category: 'warning',
          estimatedTime: '15 min',
          impact: 'medium'
        })
      })

      // Check for time tracking gaps
      const recentTimeEntries = timeEntries.filter(te => 
        isAfter(new Date(te.logged_at), addDays(now, -7))
      )
      
      if (recentTimeEntries.length === 0 && milestones.some(m => m.status === 'in_progress')) {
        newSuggestions.push({
          id: 'time-tracking-gap',
          type: 'time_tracking',
          priority: 'low',
          title: 'Time Tracking Gap',
          description: 'No time entries logged in the past week',
          action: 'Log time for active tasks',
          data: {},
          dismissible: true,
          category: 'info',
          estimatedTime: '2 min',
          impact: 'low'
        })
      }

      // Check for communication gaps
      const recentComments = milestones.flatMap(m => m.tasks).length > 0
      if (!recentComments && milestones.some(m => m.status === 'in_progress')) {
        newSuggestions.push({
          id: 'communication-gap',
          type: 'communication',
          priority: 'low',
          title: 'Communication Gap',
          description: 'Consider updating client on progress',
          action: 'Send progress update',
          data: {},
          dismissible: true,
          category: 'info',
          estimatedTime: '5 min',
          impact: 'low'
        })
      }

      // AI-powered suggestions (placeholder for now)
      if (showAISuggestions) {
        // Suggest breaking down large milestones
        const largeMilestones = milestones.filter(m => 
          m.tasks.length > 5 && m.status !== 'completed'
        )
        
        largeMilestones.forEach(milestone => {
          newSuggestions.push({
            id: `ai-breakdown-${milestone.id}`,
            type: 'ai_suggestion',
            priority: 'low',
            title: 'AI Suggestion: Break Down Milestone',
            description: `"${milestone.title}" has ${milestone.tasks.length} tasks. Consider breaking it into smaller milestones.`,
            action: 'Review milestone structure',
            data: { milestoneId: milestone.id },
            dismissible: true,
            category: 'info',
            estimatedTime: '10 min',
            impact: 'low'
          })
        })

        // Suggest priority adjustments
        const urgentTasks = milestones.flatMap(m => 
          m.tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed')
        )
        
        if (urgentTasks.length > 3) {
          newSuggestions.push({
            id: 'ai-priority-overload',
            type: 'ai_suggestion',
            priority: 'normal',
            title: 'AI Suggestion: Priority Overload',
            description: `You have ${urgentTasks.length} urgent tasks. Consider reassessing priorities.`,
            action: 'Review task priorities',
            data: { taskIds: urgentTasks.map(t => t.id) },
            dismissible: true,
            category: 'warning',
            estimatedTime: '15 min',
            impact: 'medium'
          })
        }

        // Suggest time estimates
        const tasksWithoutEstimates = milestones.flatMap(m => 
          m.tasks.filter(t => !t.estimated_hours || t.estimated_hours === 0)
        )
        
        if (tasksWithoutEstimates.length > 0) {
          newSuggestions.push({
            id: 'ai-time-estimates',
            type: 'ai_suggestion',
            priority: 'low',
            title: 'AI Suggestion: Add Time Estimates',
            description: `${tasksWithoutEstimates.length} tasks lack time estimates`,
            action: 'Add time estimates',
            data: { taskIds: tasksWithoutEstimates.map(t => t.id) },
            dismissible: true,
            category: 'info',
            estimatedTime: '5 min',
            impact: 'low'
          })
        }
      }

      return newSuggestions
    }

    setIsGenerating(true)
    const newSuggestions = generateSuggestions()
    setSuggestions(newSuggestions)
    setIsGenerating(false)
  }, [milestones, timeEntries, showAISuggestions])

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id))

  // Group suggestions by category
  const groupedSuggestions = visibleSuggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.category]) {
      acc[suggestion.category] = []
    }
    acc[suggestion.category].push(suggestion)
    return acc
  }, {} as Record<string, SmartSuggestion[]>)

  // Handle suggestion actions
  const handleSuggestionAction = async (suggestion: SmartSuggestion) => {
    try {
      switch (suggestion.type) {
        case 'overdue':
          // Follow up with client
          toast.success('Sending follow-up message...')
          break
        case 'task_due':
          // Focus on due tasks
          toast.success('Focusing on due tasks...')
          break
        case 'inactive':
          // Update milestone progress
          if (suggestion.data.milestoneId) {
            await onTaskUpdate(suggestion.data.milestoneId, { status: 'in_progress' })
            toast.success('Milestone status updated')
          }
          break
        case 'progress_slow':
          // Review timeline
          toast.success('Opening timeline review...')
          break
        case 'time_tracking':
          // Open time logging
          toast.success('Opening time logging...')
          break
        case 'communication':
          // Send progress update
          toast.success('Sending progress update...')
          break
        case 'ai_suggestion':
          // Handle AI suggestions
          toast.success('Processing AI suggestion...')
          break
        default:
          toast('Action not implemented yet')
      }
    } catch (error) {
      console.error('Error handling suggestion action:', error)
      toast.error('Failed to execute action')
    }
  }

  // Dismiss suggestion
  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...Array.from(prev), suggestionId]))
  }

  // Get suggestion icon
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'inactive': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'payment': return <CreditCard className="h-4 w-4 text-green-500" />
      case 'follow_up': return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'milestone_approval': return <CheckCircle className="h-4 w-4 text-purple-500" />
      case 'task_due': return <Calendar className="h-4 w-4 text-orange-500" />
      case 'progress_slow': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'time_tracking': return <Timer className="h-4 w-4 text-blue-500" />
      case 'communication': return <MessageCircle className="h-4 w-4 text-green-500" />
      case 'ai_suggestion': return <Brain className="h-4 w-4 text-purple-500" />
      default: return <Lightbulb className="h-4 w-4 text-gray-500" />
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'urgent': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'info': return 'bg-blue-50 border-blue-200'
      case 'success': return 'bg-green-50 border-green-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span>Smart Suggestions</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAISuggestions(!showAISuggestions)}
              className={showAISuggestions ? 'text-purple-600' : 'text-gray-400'}
            >
              <Brain className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          AI-powered insights and recommendations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGenerating ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">Generating suggestions...</span>
            </div>
          </div>
        ) : visibleSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-sm text-gray-600">All tasks are on track!</p>
            <p className="text-xs text-gray-500 mt-1">No suggestions at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSuggestions).map(([category, categorySuggestions]) => (
              <div key={category} className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 capitalize">
                  {category} ({categorySuggestions.length})
                </h4>
                <div className="space-y-2">
                  {categorySuggestions.map((suggestion) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className={`border rounded-lg p-3 space-y-2 ${getCategoryColor(suggestion.category)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getSuggestionIcon(suggestion.type)}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {suggestion.title}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getPriorityColor(suggestion.priority)}`}
                              >
                                {suggestion.priority}
                              </Badge>
                              {suggestion.estimatedTime && (
                                <span className="text-xs text-gray-500">
                                  {suggestion.estimatedTime}
                                </span>
                              )}
                              {suggestion.impact && (
                                <span className="text-xs text-gray-500">
                                  Impact: {suggestion.impact}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {suggestion.dismissible && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissSuggestion(suggestion.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600">
                        {suggestion.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuggestionAction(suggestion)}
                          className="text-xs"
                        >
                          {suggestion.action}
                        </Button>
                        {suggestion.type === 'ai_suggestion' && (
                          <div className="flex items-center space-x-1 text-xs text-purple-600">
                            <Brain className="h-3 w-3" />
                            <span>AI</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRefresh()}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDismissedSuggestions(new Set())}
              className="text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Dismissed
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
