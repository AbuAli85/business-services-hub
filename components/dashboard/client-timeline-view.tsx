'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Send,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Calendar,
  User
} from 'lucide-react'
import { format, isValid, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

interface TimelineEvent {
  id: string
  type: 'milestone' | 'task' | 'comment' | 'action_request'
  title: string
  description: string
  status: 'completed' | 'in_progress' | 'pending' | 'overdue'
  timestamp: string
  author: {
    id: string
    name: string
    role: 'provider' | 'client'
    avatar?: string
  }
  comments?: Comment[]
  actionRequests?: ActionRequest[]
}

interface Comment {
  id: string
  content: string
  milestone_id?: string
  task_id?: string
  author: {
    id: string
    name: string
    role: 'provider' | 'client'
  }
  timestamp: string
  isInternal?: boolean
}

interface ActionRequest {
  id: string
  type: 'change_request' | 'question' | 'approval_needed' | 'issue_report'
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  milestone_id?: string
  task_id?: string
  timestamp: string
  requestedBy: {
    id: string
    name: string
  }
  response?: {
    content: string
    author: {
      id: string
      name: string
    }
    timestamp: string
  }
}

interface ClientTimelineViewProps {
  bookingId: string
  milestones: any[]
  comments: Comment[]
  actionRequests: ActionRequest[]
  onCommentAdd: (milestoneId: string, content: string) => Promise<void>
  onActionRequest: (milestoneId: string, request: Omit<ActionRequest, 'id' | 'timestamp' | 'requestedBy'>) => Promise<void>
}

export function ClientTimelineView({ 
  bookingId, 
  milestones, 
  comments,
  actionRequests,
  onCommentAdd, 
  onActionRequest 
}: ClientTimelineViewProps) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [newComment, setNewComment] = useState('')
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)
  const [showActionRequest, setShowActionRequest] = useState(false)
  const [actionRequest, setActionRequest] = useState({
    type: 'change_request' as ActionRequest['type'],
    title: '',
    description: '',
    priority: 'medium' as ActionRequest['priority'],
    status: 'pending' as ActionRequest['status']
  })

  // Generate timeline events from milestones, comments, and action requests
  useEffect(() => {
    const events: TimelineEvent[] = []
    
    milestones.forEach(milestone => {
      // Add milestone event
      events.push({
        id: `milestone-${milestone.id}`,
        type: 'milestone',
        title: milestone.title,
        description: milestone.description || 'No description provided',
        status: milestone.status,
        timestamp: milestone.updated_at || milestone.created_at,
        author: {
          id: 'provider',
          name: 'Provider',
          role: 'provider'
        },
        comments: comments.filter(c => c.milestone_id === milestone.id),
        actionRequests: actionRequests.filter(ar => ar.milestone_id === milestone.id)
      })

      // Add task events
      milestone.tasks?.forEach((task: any) => {
        events.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          description: task.description || 'No description provided',
          status: task.status,
          timestamp: task.updated_at || task.created_at,
          author: {
            id: 'provider',
            name: 'Provider',
            role: 'provider'
          },
          comments: comments.filter(c => c.task_id === task.id),
          actionRequests: actionRequests.filter(ar => ar.task_id === task.id)
        })
      })
    })

    // Add standalone comments and action requests
    comments.forEach(comment => {
      if (!comment.milestone_id && !comment.task_id) {
        events.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          title: 'Comment',
          description: comment.content,
          status: 'completed',
          timestamp: comment.timestamp,
          author: comment.author
        })
      }
    })

    actionRequests.forEach(request => {
      if (!request.milestone_id && !request.task_id) {
        events.push({
          id: `action-${request.id}`,
          type: 'action_request',
          title: request.title,
          description: request.description,
          status: request.status === 'resolved' ? 'completed' : 
                  request.status === 'rejected' ? 'overdue' : 
                  request.status as 'completed' | 'in_progress' | 'pending' | 'overdue',
          timestamp: request.timestamp,
          author: {
            id: request.requestedBy.id,
            name: request.requestedBy.name,
            role: 'client' as const
          }
        })
      }
    })

    // Sort by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setTimelineEvents(events)
  }, [milestones, comments, actionRequests])

  const handleCommentSubmit = async (milestoneId: string) => {
    if (!newComment.trim()) return

    try {
      await onCommentAdd(milestoneId, newComment.trim())
      setNewComment('')
      toast.success('Comment added successfully')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const handleActionRequestSubmit = async (milestoneId: string) => {
    if (!actionRequest.title.trim() || !actionRequest.description.trim()) return

    try {
      await onActionRequest(milestoneId, actionRequest)
      setActionRequest({
        type: 'change_request',
        title: '',
        description: '',
        priority: 'medium',
        status: 'pending'
      })
      setShowActionRequest(false)
      toast.success('Action request submitted')
    } catch (error) {
      toast.error('Failed to submit action request')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
          <p className="text-sm text-gray-600">Review progress and provide feedback</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowActionRequest(!showActionRequest)}
            variant="outline"
            size="sm"
          >
            <Flag className="h-4 w-4 mr-2" />
            Request Action
          </Button>
        </div>
      </div>

      {/* Action Request Form */}
      {showActionRequest && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Request Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={actionRequest.type}
                  onChange={(e) => setActionRequest({...actionRequest, type: e.target.value as ActionRequest['type']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="change_request">Change Request</option>
                  <option value="question">Question</option>
                  <option value="approval_needed">Approval Needed</option>
                  <option value="issue_report">Issue Report</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={actionRequest.priority}
                  onChange={(e) => setActionRequest({...actionRequest, priority: e.target.value as ActionRequest['priority']})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={actionRequest.title}
                onChange={(e) => setActionRequest({...actionRequest, title: e.target.value})}
                placeholder="Brief description of your request"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <Textarea
                value={actionRequest.description}
                onChange={(e) => setActionRequest({...actionRequest, description: e.target.value})}
                placeholder="Provide detailed information about your request..."
                className="w-full"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end space-x-3">
              <Button
                onClick={() => setShowActionRequest(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleActionRequestSubmit(selectedMilestone || milestones[0]?.id)}
                disabled={!actionRequest.title.trim() || !actionRequest.description.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Events */}
      <div className="space-y-4">
        {timelineEvents.map((event, index) => (
          <Card key={event.id} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                {/* Timeline indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    event.status === 'completed' ? 'bg-green-100' :
                    event.status === 'in_progress' ? 'bg-blue-100' :
                    event.status === 'overdue' ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    {getStatusIcon(event.status)}
                  </div>
                  {index < timelineEvents.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-gray-900">{event.title}</h4>
                      <Badge className={`text-xs ${getStatusColor(event.status)}`}>
                        {event.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{format(parseISO(event.timestamp), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{event.description}</p>

                  {/* Author info */}
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
                    <User className="h-3 w-3" />
                    <span>{event.author.name} ({event.author.role})</span>
                  </div>

                  {/* Comments section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <MessageCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Comments ({event.comments?.length || 0})</span>
                    </div>

                    {/* Existing comments */}
                    {event.comments && event.comments.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {event.comments.map((comment) => (
                          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <User className="h-3 w-3 text-gray-400" />
                                <span className="text-xs font-medium text-gray-700">{comment.author.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {comment.author.role}
                                </Badge>
                              </div>
                              <span className="text-xs text-gray-500">
                                {format(parseISO(comment.timestamp), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add comment form */}
                    <div className="space-y-3">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment or ask a question..."
                        className="w-full"
                        rows={2}
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleCommentSubmit(event.id)}
                            disabled={!newComment.trim()}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Comment
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedMilestone(event.id)
                              setShowActionRequest(true)
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Flag className="h-3 w-3 mr-1" />
                            Request Action
                          </Button>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm">
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {timelineEvents.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Progress Yet</h3>
            <p className="text-gray-600">The provider hasn't started working on this project yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
