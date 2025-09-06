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
  Lightbulb
} from 'lucide-react'
import { Milestone, BookingProgress, TimeEntry } from '@/lib/progress-tracking'
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns'
import toast from 'react-hot-toast'

interface SmartSuggestion {
  id: string
  type: 'overdue' | 'inactive' | 'payment' | 'follow_up' | 'milestone_approval'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  action: string
  data?: any
  dismissible: boolean
}

interface SmartSuggestionsSidebarProps {
  milestones: Milestone[]
  bookingProgress: BookingProgress | null
  timeEntries: TimeEntry[]
  userRole: 'provider' | 'client'
  onRefresh: () => void
}

export function SmartSuggestionsSidebar({
  milestones,
  bookingProgress,
  timeEntries,
  userRole,
  onRefresh
}: SmartSuggestionsSidebarProps) {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())

  // Generate suggestions based on real data
  useEffect(() => {
    const generateSuggestions = (): SmartSuggestion[] => {
      const newSuggestions: SmartSuggestion[] = []
      const now = new Date()

      // Check for overdue milestones
      const overdueMilestones = milestones.filter(m => 
        m.due_date && 
        isBefore(new Date(m.due_date), now) && 
        m.status !== 'completed' && 
        m.status !== 'cancelled'
      )

      overdueMilestones.forEach(milestone => {
        newSuggestions.push({
          id: `overdue-${milestone.id}`,
          type: 'overdue',
          priority: 'high',
          title: 'Overdue Milestone',
          description: `"${milestone.title}" was due ${formatDistanceToNow(new Date(milestone.due_date!), { addSuffix: true })}`,
          action: 'Follow up with client',
          data: { milestoneId: milestone.id },
          dismissible: true
        })
      })

      // Check for inactive milestones (no updates in 2+ days)
      const inactiveMilestones = milestones.filter(m => {
        if (m.status === 'completed' || m.status === 'cancelled') return false
        const lastUpdate = new Date(m.updated_at)
        const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        return daysSinceUpdate >= 2
      })

      inactiveMilestones.forEach(milestone => {
        newSuggestions.push({
          id: `inactive-${milestone.id}`,
          type: 'inactive',
          priority: 'medium',
          title: 'Inactive Milestone',
          description: `"${milestone.title}" hasn't been updated in ${Math.floor((now.getTime() - new Date(milestone.updated_at).getTime()) / (1000 * 60 * 60 * 24))} days`,
          action: 'Send update to client',
          data: { milestoneId: milestone.id },
          dismissible: true
        })
      })

      // Check for tasks needing approval (client role)
      if (userRole === 'client') {
        const tasksNeedingApproval = milestones.flatMap(m => 
          m.tasks?.filter(t => t.approval_status === 'pending') || []
        )

        tasksNeedingApproval.forEach(task => {
          newSuggestions.push({
            id: `approval-${task.id}`,
            type: 'milestone_approval',
            priority: 'medium',
            title: 'Task Approval Needed',
            description: `"${task.title}" is waiting for your approval`,
            action: 'Review and approve',
            data: { taskId: task.id },
            dismissible: false
          })
        })
      }

      // Check for upcoming due dates (within 3 days)
      const upcomingDueDates = milestones.filter(m => {
        if (!m.due_date || m.status === 'completed' || m.status === 'cancelled') return false
        const dueDate = new Date(m.due_date)
        const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        return daysUntilDue <= 3 && daysUntilDue > 0
      })

      upcomingDueDates.forEach(milestone => {
        newSuggestions.push({
          id: `upcoming-${milestone.id}`,
          type: 'follow_up',
          priority: 'low',
          title: 'Upcoming Due Date',
          description: `"${milestone.title}" is due in ${Math.ceil((new Date(milestone.due_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`,
          action: 'Prepare for completion',
          data: { milestoneId: milestone.id },
          dismissible: true
        })
      })

      // Check for time tracking efficiency
      const totalEstimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      const totalActualHours = timeEntries.reduce((sum, entry) => 
        sum + (entry.duration_minutes || 0) / 60, 0
      )

      if (totalEstimatedHours > 0 && totalActualHours > 0) {
        const efficiency = (totalActualHours / totalEstimatedHours) * 100
        
        if (efficiency > 120) {
          newSuggestions.push({
            id: 'efficiency-warning',
            type: 'follow_up',
            priority: 'medium',
            title: 'Time Overrun',
            description: `Project is ${(efficiency - 100).toFixed(0)}% over estimated time`,
            action: 'Review timeline and scope',
            data: { efficiency },
            dismissible: true
          })
        } else if (efficiency < 80) {
          newSuggestions.push({
            id: 'efficiency-positive',
            type: 'follow_up',
            priority: 'low',
            title: 'Ahead of Schedule',
            description: `Project is ${(100 - efficiency).toFixed(0)}% under estimated time`,
            action: 'Consider additional features',
            data: { efficiency },
            dismissible: true
          })
        }
      }

      return newSuggestions
    }

    const newSuggestions = generateSuggestions()
    setSuggestions(newSuggestions)
  }, [milestones, timeEntries, userRole])

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedSuggestions.has(s.id))

  // Handle suggestion actions
  const handleSuggestionAction = async (suggestion: SmartSuggestion) => {
    try {
      switch (suggestion.type) {
        case 'overdue':
        case 'inactive':
          // Send update to client
          toast.success('Update sent to client')
          break
        case 'milestone_approval':
          // Navigate to task approval
          toast.success('Redirecting to task approval')
          break
        case 'follow_up':
          // Schedule follow-up
          toast.success('Follow-up scheduled')
          break
        default:
          toast.success('Action completed')
      }
      
      // Dismiss the suggestion after action
      if (suggestion.dismissible) {
        setDismissedSuggestions(prev => new Set([...Array.from(prev), suggestion.id]))
      }
    } catch (error) {
      console.error('Error handling suggestion action:', error)
      toast.error('Failed to complete action')
    }
  }

  // Dismiss suggestion
  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...Array.from(prev), suggestionId]))
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Get icon for suggestion type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'inactive':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'payment':
        return <CreditCard className="h-4 w-4 text-blue-600" />
      case 'follow_up':
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case 'milestone_approval':
        return <CheckCircle className="h-4 w-4 text-purple-600" />
      default:
        return <Lightbulb className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Smart Suggestions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleSuggestions.length === 0 ? (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No suggestions at the moment</p>
            <p className="text-xs text-gray-400 mt-1">All tasks are on track!</p>
          </div>
        ) : (
          visibleSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getSuggestionIcon(suggestion.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {suggestion.title}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(suggestion.priority)}`}
                    >
                      {suggestion.priority}
                    </Badge>
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
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSuggestionAction(suggestion)}
                className="w-full text-xs"
              >
                {suggestion.action}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}