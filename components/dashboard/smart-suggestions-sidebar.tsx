'use client'

import { useState } from 'react'
import { Lightbulb, Send, Calendar, CreditCard, X, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Suggestion {
  id: string
  type: 'progress_update' | 'follow_up' | 'payment_reminder'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionText: string
}

interface SmartSuggestionsSidebarProps {
  onSendUpdate?: () => void
  onScheduleFollowUp?: () => void
  onSendPaymentReminder?: () => void
  onDismissSuggestion?: (suggestionId: string) => void
}

export function SmartSuggestionsSidebar({
  onSendUpdate,
  onScheduleFollowUp,
  onSendPaymentReminder,
  onDismissSuggestion
}: SmartSuggestionsSidebarProps) {
  const [suggestions] = useState<Suggestion[]>([
    {
      id: '1',
      type: 'progress_update',
      title: 'Send Progress Update',
      description: 'Client hasn\'t received an update in 2 days',
      priority: 'medium',
      actionText: 'Send update now'
    },
    {
      id: '2',
      type: 'follow_up',
      title: 'Schedule Follow-up',
      description: 'Book next milestone review meeting',
      priority: 'high',
      actionText: 'Schedule meeting'
    },
    {
      id: '3',
      type: 'payment_reminder',
      title: 'Payment Reminder',
      description: 'Invoice due in 3 days',
      priority: 'medium',
      actionText: 'Send reminder'
    }
  ])

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'progress_update': return <Send className="h-4 w-4" />
      case 'follow_up': return <Calendar className="h-4 w-4" />
      case 'payment_reminder': return <CreditCard className="h-4 w-4" />
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
    }
  }

  return (
    <div className="w-80 bg-purple-50 border border-purple-200 rounded-lg p-4 h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">Smart Suggestions</h3>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getSuggestionIcon(suggestion.type)}
                <h4 className="font-medium text-gray-900 text-sm">{suggestion.title}</h4>
              </div>
              <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                {suggestion.priority}
              </Badge>
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
                onClick={() => onDismissSuggestion?.(suggestion.id)}
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
