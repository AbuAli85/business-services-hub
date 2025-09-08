'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  Play, 
  Pause, 
  AlertTriangle, 
  Target, 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Zap, 
  Star, 
  Award, 
  Users, 
  MessageSquare, 
  Shield, 
  Eye, 
  Download, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Search
} from 'lucide-react'
import { format, isAfter, isBefore, differenceInDays, differenceInHours, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { Milestone, Task, UserRole } from '@/types/progress'

interface ProjectTimelineVisualizationProps {
  milestones: Milestone[]
  userRole: UserRole
  onMilestoneUpdate?: (milestoneId: string, updates: Partial<Milestone>) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  commentsByMilestone?: Record<string, any[]>
  approvalsByMilestone?: Record<string, any[]>
  timeEntries?: any[]
  className?: string
}

interface TimelineEvent {
  id: string
  type: 'milestone_start' | 'milestone_complete' | 'task_complete' | 'approval' | 'comment' | 'time_entry' | 'deadline'
  title: string
  description: string
  date: Date
  milestoneId?: string
  taskId?: string
  status: 'completed' | 'pending' | 'overdue' | 'in_progress'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  user?: string
  icon: React.ReactNode
  color: string
  category: string
}

interface TimelineView {
  type: 'month' | 'week' | 'day'
  startDate: Date
  endDate: Date
  zoom: number
}

export function ProjectTimelineVisualization({
  milestones,
  userRole,
  onMilestoneUpdate,
  onTaskUpdate,
  commentsByMilestone = {},
  approvalsByMilestone = {},
  timeEntries = [],
  className = ""
}: ProjectTimelineVisualizationProps) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [timelineView, setTimelineView] = useState<TimelineView>({
    type: 'month',
    startDate: new Date(),
    endDate: new Date(),
    zoom: 1
  })
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; date: Date } | null>(null)
  
  const timelineRef = useRef<HTMLDivElement>(null)

  // Generate timeline events from milestones and related data
  useEffect(() => {
    const generateTimelineEvents = () => {
      const events: TimelineEvent[] = []
      const now = new Date()

      // Add milestone events
      milestones.forEach(milestone => {
        // Milestone start
        events.push({
          id: `milestone-start-${milestone.id}`,
          type: 'milestone_start',
          title: `${milestone.title} Started`,
          description: `Work began on ${milestone.title}`,
          date: new Date(milestone.created_at),
          milestoneId: milestone.id,
          status: milestone.status === 'completed' ? 'completed' : 
                 milestone.status === 'in_progress' ? 'in_progress' : 'pending',
          priority: 'medium',
          user: 'Team Member',
          icon: <Play className="h-4 w-4" />,
          color: 'text-blue-600 bg-blue-50',
          category: 'milestone'
        })

        // Milestone completion
        if (milestone.status === 'completed' && milestone.completed_at) {
          events.push({
            id: `milestone-complete-${milestone.id}`,
            type: 'milestone_complete',
            title: `${milestone.title} Completed`,
            description: `Successfully completed ${milestone.title}`,
            date: new Date(milestone.completed_at),
            milestoneId: milestone.id,
            status: 'completed',
            priority: 'high',
            user: 'Team Member',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'text-green-600 bg-green-50',
            category: 'milestone'
          })
        }

        // Milestone deadline
        if (milestone.due_date) {
          const isOverdue = isAfter(now, new Date(milestone.due_date)) && milestone.status !== 'completed'
          events.push({
            id: `milestone-deadline-${milestone.id}`,
            type: 'deadline',
            title: `${milestone.title} Deadline`,
            description: `Due date for ${milestone.title}`,
            date: new Date(milestone.due_date),
            milestoneId: milestone.id,
            status: isOverdue ? 'overdue' : 'pending',
            priority: isOverdue ? 'urgent' : 'high',
            user: 'System',
            icon: <Calendar className="h-4 w-4" />,
            color: isOverdue ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50',
            category: 'deadline'
          })
        }

        // Task completion events
        if (milestone.tasks) {
          milestone.tasks.forEach(task => {
            if (task.status === 'completed' && task.completed_at) {
              events.push({
                id: `task-complete-${task.id}`,
                type: 'task_complete',
                title: `${task.title} Completed`,
                description: `Task completed in ${milestone.title}`,
                date: new Date(task.completed_at),
                milestoneId: milestone.id,
                taskId: task.id,
                status: 'completed',
                priority: 'medium',
                user: 'Team Member',
                icon: <CheckCircle className="h-4 w-4" />,
                color: 'text-green-600 bg-green-50',
                category: 'task'
              })
            }
          })
        }

        // Approval events
        const approvals = approvalsByMilestone[milestone.id] || []
        approvals.forEach((approval, index) => {
          events.push({
            id: `approval-${milestone.id}-${index}`,
            type: 'approval',
            title: `Approval ${approval.status === 'approved' ? 'Granted' : 'Rejected'}`,
            description: `${approval.status} for ${milestone.title}`,
            date: new Date(approval.created_at),
            milestoneId: milestone.id,
            status: approval.status === 'approved' ? 'completed' : 'pending',
            priority: 'high',
            user: approval.approved_by || 'Client',
            icon: <Shield className="h-4 w-4" />,
            color: approval.status === 'approved' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50',
            category: 'approval'
          })
        })

        // Comment events
        const comments = commentsByMilestone[milestone.id] || []
        comments.forEach((comment, index) => {
          events.push({
            id: `comment-${milestone.id}-${index}`,
            type: 'comment',
            title: 'New Comment',
            description: `Comment added to ${milestone.title}`,
            date: new Date(comment.created_at),
            milestoneId: milestone.id,
            status: 'completed',
            priority: 'low',
            user: comment.created_by || 'User',
            icon: <MessageSquare className="h-4 w-4" />,
            color: 'text-blue-600 bg-blue-50',
            category: 'communication'
          })
        })
      })

      // Add time entry events
      timeEntries.forEach((entry, index) => {
        events.push({
          id: `time-entry-${index}`,
          type: 'time_entry',
          title: 'Time Logged',
          description: `${entry.duration || 0} hours logged`,
          date: new Date(entry.created_at),
          milestoneId: entry.milestone_id,
          status: 'completed',
          priority: 'low',
          user: entry.user_id || 'Team Member',
          icon: <Clock className="h-4 w-4" />,
          color: 'text-purple-600 bg-purple-50',
          category: 'time'
        })
      })

      // Sort events by date
      events.sort((a, b) => a.date.getTime() - b.date.getTime())
      setTimelineEvents(events)
    }

    generateTimelineEvents()
  }, [milestones, commentsByMilestone, approvalsByMilestone, timeEntries])

  // Update timeline view based on type
  useEffect(() => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (timelineView.type) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = startOfWeek(now)
        endDate = endOfWeek(now)
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
    }

    setTimelineView(prev => ({ ...prev, startDate, endDate }))
  }, [timelineView.type])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'milestone_start': return <Play className="h-4 w-4" />
      case 'milestone_complete': return <CheckCircle className="h-4 w-4" />
      case 'task_complete': return <CheckCircle className="h-4 w-4" />
      case 'approval': return <Shield className="h-4 w-4" />
      case 'comment': return <MessageSquare className="h-4 w-4" />
      case 'time_entry': return <Clock className="h-4 w-4" />
      case 'deadline': return <Calendar className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getEventColor = (status: string, priority: string) => {
    if (status === 'overdue') return 'text-red-600 bg-red-50 border-red-200'
    if (status === 'completed') return 'text-green-600 bg-green-50 border-green-200'
    if (status === 'in_progress') return 'text-blue-600 bg-blue-50 border-blue-200'
    if (priority === 'urgent') return 'text-red-600 bg-red-50 border-red-200'
    if (priority === 'high') return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredEvents = timelineEvents.filter(event => {
    const matchesCategory = filterCategory === 'all' || event.category === filterCategory
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase())
    const isInRange = event.date >= timelineView.startDate && event.date <= timelineView.endDate
    return matchesCategory && matchesSearch && isInRange
  })

  const navigateTimeline = (direction: 'prev' | 'next') => {
    const amount = timelineView.type === 'day' ? 1 : timelineView.type === 'week' ? 7 : 30
    const multiplier = direction === 'next' ? 1 : -1
    const newStartDate = new Date(timelineView.startDate.getTime() + (amount * multiplier * 24 * 60 * 60 * 1000))
    const newEndDate = new Date(timelineView.endDate.getTime() + (amount * multiplier * 24 * 60 * 60 * 1000))
    setTimelineView(prev => ({ ...prev, startDate: newStartDate, endDate: newEndDate }))
  }

  const resetTimeline = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (timelineView.type) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = startOfWeek(now)
        endDate = endOfWeek(now)
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
    }

    setTimelineView(prev => ({ ...prev, startDate, endDate }))
  }

  const selectedEventData = selectedEvent 
    ? timelineEvents.find(e => e.id === selectedEvent)
    : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Project Timeline Visualization
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={timelineView.type === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimelineView(prev => ({ ...prev, type: 'day' }))}
              >
                Day
              </Button>
              <Button
                variant={timelineView.type === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimelineView(prev => ({ ...prev, type: 'week' }))}
              >
                Week
              </Button>
              <Button
                variant={timelineView.type === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimelineView(prev => ({ ...prev, type: 'month' }))}
              >
                Month
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search timeline events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Filter by category"
              >
                <option value="all">All Categories</option>
                <option value="milestone">Milestones</option>
                <option value="task">Tasks</option>
                <option value="approval">Approvals</option>
                <option value="communication">Communication</option>
                <option value="time">Time Tracking</option>
                <option value="deadline">Deadlines</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={resetTimeline}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTimeline('prev')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {format(timelineView.startDate, 'MMM dd, yyyy')} - {format(timelineView.endDate, 'MMM dd, yyyy')}
                </h3>
                <p className="text-sm text-gray-600">
                  {filteredEvents.length} events in this period
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTimeline('next')}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimelineView(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom - 0.1) }))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">{Math.round(timelineView.zoom * 100)}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimelineView(prev => ({ ...prev, zoom: Math.min(2, prev.zoom + 0.1) }))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Events */}
      <div className="space-y-4">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((event) => (
            <Card 
              key={event.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedEvent === event.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedEvent(
                selectedEvent === event.id ? null : event.id
              )}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${event.color}`}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {event.title}
                      </h3>
                      <Badge className={getEventColor(event.status, event.priority)}>
                        {event.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge className={getPriorityColor(event.priority)}>
                        {event.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(event.date, 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                      {event.user && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{event.user}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>{event.category}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No events found in this period</p>
                <p className="text-sm">Try adjusting your filters or date range</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Event Details */}
      {selectedEventData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Event Details
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${selectedEventData.color}`}>
                  {getEventIcon(selectedEventData.type)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedEventData.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{selectedEventData.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Event Information</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Type:</span>
                          <span className="text-sm text-gray-900">{selectedEventData.type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <Badge className={getEventColor(selectedEventData.status, selectedEventData.priority)}>
                            {selectedEventData.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Priority:</span>
                          <Badge className={getPriorityColor(selectedEventData.priority)}>
                            {selectedEventData.priority}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Category:</span>
                          <span className="text-sm text-gray-900">{selectedEventData.category}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Timing</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Date:</span>
                          <span className="text-sm text-gray-900">
                            {format(selectedEventData.date, 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Time:</span>
                          <span className="text-sm text-gray-900">
                            {format(selectedEventData.date, 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">User:</span>
                          <span className="text-sm text-gray-900">{selectedEventData.user}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Timeline Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredEvents.length}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredEvents.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredEvents.filter(e => e.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredEvents.filter(e => e.status === 'overdue').length}
              </div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
