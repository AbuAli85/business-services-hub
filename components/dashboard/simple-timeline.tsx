'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  Clock,
  CheckCircle,
  Circle,
  ArrowRight,
  MessageSquare,
  Target,
  TrendingUp
} from 'lucide-react'
import { format, isAfter, isBefore, isToday } from 'date-fns'

interface SimpleTask {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  isRecurring?: boolean
  recurringType?: 'monthly' | 'weekly' | 'daily'
  priority?: 'low' | 'medium' | 'high'
  estimatedHours?: number
  actualHours?: number
}

interface SimpleMilestone {
  id: string
  title: string
  description?: string
  purpose?: string
  mainGoal?: string
  startDate: string
  endDate: string
  status: 'not_started' | 'in_progress' | 'completed'
  tasks: SimpleTask[]
  color: string
  phaseNumber: number
  estimatedHours?: number
  actualHours?: number
  clientComments?: Comment[]
}

interface Comment {
  id: string
  text: string
  author: string
  authorRole: 'provider' | 'client'
  createdAt: string
}

interface SimpleTimelineProps {
  milestones: SimpleMilestone[]
  userRole: 'provider' | 'client'
}

export function SimpleTimeline({ milestones, userRole }: SimpleTimelineProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null)

  // Sort milestones by start date
  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-500" />
      default: return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isOverdue = (milestone: SimpleMilestone) => {
    if (milestone.status === 'completed') return false
    return isAfter(new Date(), new Date(milestone.endDate))
  }

  const isUpcoming = (milestone: SimpleMilestone) => {
    return isAfter(new Date(milestone.startDate), new Date()) && milestone.status === 'not_started'
  }

  const isCurrent = (milestone: SimpleMilestone) => {
    const now = new Date()
    const start = new Date(milestone.startDate)
    const end = new Date(milestone.endDate)
    return !isAfter(now, end) && !isBefore(now, start) && milestone.status !== 'completed'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Timeline</h2>
          <p className="text-gray-600">Track your project phases and progress over time</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            {milestones.filter(m => m.status === 'completed').length} of {milestones.length} phases completed
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        <div className="space-y-8">
          {sortedMilestones.map((milestone, index) => {
            const completedTasks = milestone.tasks.filter(t => t.completed).length
            const totalTasks = milestone.tasks.length
            const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
            const overdue = isOverdue(milestone)
            const upcoming = isUpcoming(milestone)
            const current = isCurrent(milestone)

            return (
              <div key={milestone.id} className="relative flex items-start space-x-6">
                {/* Timeline Dot */}
                <div className="relative z-10 flex-shrink-0">
                  <div 
                    className={`w-16 h-16 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${
                      milestone.status === 'completed' ? 'bg-green-500' :
                      milestone.status === 'in_progress' ? 'bg-blue-500' :
                      overdue ? 'bg-red-500' :
                      upcoming ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}
                  >
                    {getStatusIcon(milestone.status)}
                  </div>
                  {overdue && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <Card className={`transition-all duration-300 hover:shadow-lg ${
                    selectedMilestone === milestone.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                  } ${overdue ? 'border-red-200 bg-red-50' : ''} ${upcoming ? 'border-yellow-200 bg-yellow-50' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className={`${getStatusColor(milestone.status)}`}>
                            Phase {milestone.phaseNumber}
                          </Badge>
                          <CardTitle className="text-lg">{milestone.title}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          {overdue && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                          {upcoming && (
                            <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                              Upcoming
                            </Badge>
                          )}
                          {current && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                              Current
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {milestone.description && (
                        <p className="text-sm text-gray-600 mt-2">{milestone.description}</p>
                      )}
                      
                      {milestone.purpose && (
                        <p className="text-xs text-blue-600 mt-1">
                          <strong>Purpose:</strong> {milestone.purpose}
                        </p>
                      )}
                      
                      {milestone.mainGoal && (
                        <p className="text-xs text-green-600 mt-1">
                          <strong>Main Goal:</strong> {milestone.mainGoal}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Progress</span>
                          <span className="text-sm font-bold text-gray-900">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              milestone.status === 'completed' ? 'bg-green-500' :
                              milestone.status === 'in_progress' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                          <span>{completedTasks} of {totalTasks} tasks completed</span>
                          <span>{format(new Date(milestone.startDate), 'MMM dd')} - {format(new Date(milestone.endDate), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>

                      {/* Tasks Preview */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">Tasks</h4>
                        <div className="space-y-1">
                          {milestone.tasks.slice(0, 3).map((task) => (
                            <div key={task.id} className="flex items-center space-x-2 text-sm">
                              {task.completed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-400" />
                              )}
                              <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </span>
                              {task.priority && (
                                <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </Badge>
                              )}
                              {task.dueDate && (
                                <span className="text-xs text-gray-500">
                                  {format(new Date(task.dueDate), 'MMM dd')}
                                </span>
                              )}
                            </div>
                          ))}
                          {milestone.tasks.length > 3 && (
                            <p className="text-xs text-gray-500 italic">
                              +{milestone.tasks.length - 3} more tasks
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Comments Preview */}
                      {milestone.clientComments && milestone.clientComments.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MessageSquare className="h-4 w-4" />
                            <span>{milestone.clientComments.length} comment{milestone.clientComments.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {milestone.estimatedHours || 0}h estimated
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMilestone(
                            selectedMilestone === milestone.id ? null : milestone.id
                          )}
                        >
                          {selectedMilestone === milestone.id ? 'Hide Details' : 'View Details'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {milestones.filter(m => m.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {milestones.filter(m => m.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Upcoming</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {milestones.filter(m => isUpcoming(m)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Total Tasks</p>
                <p className="text-2xl font-bold text-purple-600">
                  {milestones.reduce((sum, m) => sum + m.tasks.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
