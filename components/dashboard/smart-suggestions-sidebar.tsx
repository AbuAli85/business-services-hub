'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, Send, Calendar, CreditCard, X, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Milestone, BookingProgress } from '@/types/progress'
import { isMilestoneOverdue } from '@/lib/progress-calculations'

interface Suggestion {
  id: string
  type: 'progress_update' | 'follow_up' | 'payment_reminder' | 'overdue_milestone' | 'milestone_approval'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionText: string
  metadata?: any
}

interface SmartSuggestionsSidebarProps {
  bookingProgress: BookingProgress | null
  milestones: Milestone[]
  onSendUpdate?: () => void
  onScheduleFollowUp?: () => void
  onSendPaymentReminder?: () => void
  onDismissSuggestion?: (suggestionId: string) => void
}

export function SmartSuggestionsSidebar({
  bookingProgress,
  milestones,
  onSendUpdate,
  onScheduleFollowUp,
  onSendPaymentReminder,
  onDismissSuggestion
}: SmartSuggestionsSidebarProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())

  useEffect(() => {
    generateSuggestions()
  }, [bookingProgress, milestones])

  const generateSuggestions = () => {
    if (!bookingProgress || !milestones.length) return

    const newSuggestions: Suggestion[] = []

    // Check for overdue milestones
    const overdueMilestones = milestones.filter(m => isMilestoneOverdue(m))
    if (overdueMilestones.length > 0) {
      newSuggestions.push({
        id: 'overdue_milestones',
        type: 'overdue_milestone',
        title: 'Overdue Milestones',
        description: `${overdueMilestones.length} milestone${overdueMilestones.length > 1 ? 's' : ''} overdue`,
        priority: 'high',
        actionText: 'Review overdue',
        metadata: { overdueCount: overdueMilestones.length }
      })
    }

    // Check for progress update needed (no update in 2+ days)
    const lastUpdate = bookingProgress.updated_at ? new Date(bookingProgress.updated_at) : new Date()
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceUpdate >= 2) {
      newSuggestions.push({
        id: 'progress_update',
        type: 'progress_update',
        title: 'Send Progress Update',
        description: `Client hasn't received an update in ${daysSinceUpdate} days`,
        priority: daysSinceUpdate >= 5 ? 'high' : 'medium',
        actionText: 'Send update now'
      })
    }

    // Check for completed milestones needing approval
    const completedMilestones = milestones.filter(m => m.status === 'completed')
    if (completedMilestones.length > 0) {
      newSuggestions.push({
        id: 'milestone_approval',
        type: 'milestone_approval',
        title: 'Milestone Approval',
        description: `${completedMilestones.length} milestone${completedMilestones.length > 1 ? 's' : ''} ready for approval`,
        priority: 'medium',
        actionText: 'Review milestones'
      })
    }

    // Check for upcoming deadlines (within 3 days)
    const upcomingDeadlines = milestones.filter(m => {
      if (!m.due_date || m.status === 'completed') return false
      const daysUntilDue = Math.ceil((new Date(m.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      return daysUntilDue >= 0 && daysUntilDue <= 3
    })
    if (upcomingDeadlines.length > 0) {
      newSuggestions.push({
        id: 'follow_up',
        type: 'follow_up',
        title: 'Schedule Follow-up',
        description: `${upcomingDeadlines.length} milestone${upcomingDeadlines.length > 1 ? 's' : ''} due soon`,
        priority: 'medium',
        actionText: 'Schedule meeting'
      })
    }

    // Mock payment reminder (would be based on real invoice data)
    newSuggestions.push({
      id: 'payment_reminder',
      type: 'payment_reminder',
      title: 'Payment Reminder',
      description: 'Invoice due in 3 days',
      priority: 'medium',
      actionText: 'Send reminder'
    })

    // Filter out dismissed suggestions
    const filteredSuggestions = newSuggestions.filter(s => !dismissedSuggestions.has(s.id))
    setSuggestions(filteredSuggestions)
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'progress_update': return <Send className="h-4 w-4" />
      case 'follow_up': return <Calendar className="h-4 w-4" />
      case 'payment_reminder': return <CreditCard className="h-4 w-4" />
      case 'overdue_milestone': return <AlertCircle className="h-4 w-4" />
      case 'milestone_approval': return <CheckCircle className="h-4 w-4" />
      default: return <Lightbulb className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  const handleAction = (suggestion: Suggestion) => {
    switch (suggestion.type) {
      case 'progress_update':
        onSendUpdate?.()
        break
      case 'follow_up':
        onScheduleFollowUp?.()
        break
      case 'payment_reminder':
        onSendPaymentReminder?.()
        break
      case 'overdue_milestone':
        // Could navigate to milestones tab or open modal
        console.log('Review overdue milestones')
        break
      case 'milestone_approval':
        // Could navigate to milestones tab
        console.log('Review milestone approvals')
        break
    }
  }

  const handleDismiss = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(Array.from(prev).concat(suggestionId)))
    onDismissSuggestion?.(suggestionId)
  }

  if (suggestions.length === 0) {
    return (
      <div className="w-80 bg-purple-50 border border-purple-200 rounded-lg p-4 h-fit">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Smart Suggestions</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 font-medium">All caught up!</p>
          <p className="text-xs text-gray-500 mt-1">No suggestions at the moment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-purple-50 border border-purple-200 rounded-lg p-4 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">Smart Suggestions</h3>
        <Badge className="bg-purple-100 text-purple-800">
          {suggestions.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getSuggestionIcon(suggestion.type)}
                <h4 className="font-medium text-gray-900 text-sm">{suggestion.title}</h4>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg">{getPriorityIcon(suggestion.priority)}</span>
                <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                  {suggestion.priority}
                </Badge>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mb-3">{suggestion.description}</p>
            
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                onClick={() => handleAction(suggestion)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
              >
                {suggestion.actionText}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(suggestion.id)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
