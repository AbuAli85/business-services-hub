'use client'

import { useState, useEffect } from 'react'
import { Bell, Send, Calendar, CreditCard, AlertCircle, Clock, CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Suggestion {
  id: string
  type: 'progress_update' | 'follow_up' | 'payment_reminder' | 'overdue_task' | 'milestone_approval'
  title: string
  description: string
  priority: 'high' | 'normal' | 'low'
  actionRequired: boolean
  dueDate?: string
  metadata?: Record<string, any>
}

interface SmartSuggestionsAlertBarProps {
  bookingId: string
  userRole: 'provider' | 'client'
  onSendUpdate?: () => void
  onScheduleFollowUp?: () => void
  onSendPaymentReminder?: () => void
  onApproveMilestone?: (milestoneId: string) => void
  onDismissSuggestion?: (suggestionId: string) => void
}

export function SmartSuggestionsAlertBar({
  bookingId,
  userRole,
  onSendUpdate,
  onScheduleFollowUp,
  onSendPaymentReminder,
  onApproveMilestone,
  onDismissSuggestion
}: SmartSuggestionsAlertBarProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    generateSuggestions()
  }, [bookingId, userRole])

  const generateSuggestions = () => {
    // This would typically fetch from an API or be passed as props
    // For now, we'll generate some mock suggestions based on common scenarios
    const mockSuggestions: Suggestion[] = [
      {
        id: '1',
        type: 'progress_update',
        title: 'Send Progress Update',
        description: 'Client hasn\'t received an update in 2 days',
        priority: 'high',
        actionRequired: true,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        type: 'overdue_task',
        title: 'Overdue Task Alert',
        description: '1 task is overdue and needs attention',
        priority: 'high',
        actionRequired: true
      },
      {
        id: '3',
        type: 'payment_reminder',
        title: 'Payment Reminder',
        description: 'Invoice is due in 3 days',
        priority: 'normal',
        actionRequired: true,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'follow_up',
        title: 'Schedule Follow-up',
        description: 'Milestone completed, schedule client review',
        priority: 'normal',
        actionRequired: false
      }
    ]

    setSuggestions(mockSuggestions)
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'progress_update': return <Send className="h-4 w-4" />
      case 'follow_up': return <Calendar className="h-4 w-4" />
      case 'payment_reminder': return <CreditCard className="h-4 w-4" />
      case 'overdue_task': return <AlertCircle className="h-4 w-4" />
      case 'milestone_approval': return <CheckCircle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
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
      case 'milestone_approval':
        onApproveMilestone?.(suggestion.metadata?.milestoneId)
        break
    }
    
    // Remove the suggestion after action
    onDismissSuggestion?.(suggestion.id)
  }

  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high')
  const otherSuggestions = suggestions.filter(s => s.priority !== 'high')

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Alert Bar Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-5 w-5 text-blue-600" />
            {highPrioritySuggestions.length > 0 && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{highPrioritySuggestions.length}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Smart Suggestions</h3>
            <p className="text-sm text-gray-600">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {highPrioritySuggestions.length > 0 && (
            <Badge className="bg-red-100 text-red-800 border-red-200">
              {highPrioritySuggestions.length} urgent
            </Badge>
          )}
          <Button variant="ghost" size="sm">
            {isExpanded ? 'Collapse' : 'View All'}
          </Button>
        </div>
      </div>

      {/* Expanded Suggestions */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {/* High Priority Suggestions */}
          {highPrioritySuggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-600">
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-red-900">{suggestion.title}</h4>
                  <Badge className={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-red-700">{suggestion.description}</p>
                {suggestion.dueDate && (
                  <p className="text-xs text-red-600 mt-1">
                    Due: {new Date(suggestion.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(suggestion)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Take Action
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismissSuggestion?.(suggestion.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Other Suggestions */}
          {otherSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-gray-600">
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                  <Badge className={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700">{suggestion.description}</p>
                {suggestion.dueDate && (
                  <p className="text-xs text-gray-600 mt-1">
                    Due: {new Date(suggestion.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(suggestion)}
                >
                  Action
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDismissSuggestion?.(suggestion.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Quick Actions */}
          <div className="border-t border-gray-200 pt-3">
            <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onSendUpdate}
                className="flex items-center gap-1"
              >
                <Send className="h-4 w-4" />
                Send Update
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onScheduleFollowUp}
                className="flex items-center gap-1"
              >
                <Calendar className="h-4 w-4" />
                Schedule Follow-up
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSendPaymentReminder}
                className="flex items-center gap-1"
              >
                <CreditCard className="h-4 w-4" />
                Payment Reminder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
