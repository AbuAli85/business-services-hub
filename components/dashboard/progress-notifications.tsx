'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Target,
  Zap,
  Calendar,
  Users,
  Award
} from 'lucide-react'

interface ProgressNotification {
  id: string
  type: 'milestone_completed' | 'task_overdue' | 'progress_milestone' | 'velocity_change' | 'deadline_approaching'
  title: string
  message: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  timestamp: string
  action?: {
    label: string
    onClick: () => void
  }
  dismissed?: boolean
}

interface ProgressNotificationsProps {
  bookingId: string
  milestones: any[]
  tasks: any[]
  userRole: 'provider' | 'client'
}

export function ProgressNotifications({ 
  bookingId, 
  milestones = [], 
  tasks = [], 
  userRole 
}: ProgressNotificationsProps) {
  const [notifications, setNotifications] = useState<ProgressNotification[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    generateNotifications()
  }, [milestones, tasks])

  const generateNotifications = () => {
    const newNotifications: ProgressNotification[] = []

    // Check for completed milestones
    const completedMilestones = milestones.filter(m => m.status === 'completed')
    if (completedMilestones.length > 0) {
      newNotifications.push({
        id: 'milestone-completed',
        type: 'milestone_completed',
        title: 'Milestone Completed! 🎉',
        message: `${completedMilestones.length} milestone${completedMilestones.length > 1 ? 's' : ''} completed successfully`,
        priority: 'high',
        timestamp: new Date().toISOString(),
        action: {
          label: 'View Details',
          onClick: () => console.log('View milestone details')
        }
      })
    }

    // Check for overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false
      return new Date(t.due_date) < new Date()
    })

    if (overdueTasks.length > 0) {
      newNotifications.push({
        id: 'tasks-overdue',
        type: 'task_overdue',
        title: 'Overdue Tasks Alert',
        message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} are past their due date`,
        priority: 'urgent',
        timestamp: new Date().toISOString(),
        action: {
          label: 'Review Tasks',
          onClick: () => console.log('Review overdue tasks')
        }
      })
    }

    // Check for progress milestones
    const progress = calculateOverallProgress()
    if (progress >= 25 && progress < 50) {
      newNotifications.push({
        id: 'progress-25',
        type: 'progress_milestone',
        title: '25% Complete! 🚀',
        message: 'Great start! You\'ve completed a quarter of the project',
        priority: 'normal',
        timestamp: new Date().toISOString(),
        action: {
          label: 'Keep Going',
          onClick: () => console.log('Continue progress')
        }
      })
    } else if (progress >= 50 && progress < 75) {
      newNotifications.push({
        id: 'progress-50',
        type: 'progress_milestone',
        title: 'Halfway There! 💪',
        message: 'Excellent work! You\'re halfway through the project',
        priority: 'normal',
        timestamp: new Date().toISOString(),
        action: {
          label: 'Push Forward',
          onClick: () => console.log('Continue progress')
        }
      })
    } else if (progress >= 75 && progress < 100) {
      newNotifications.push({
        id: 'progress-75',
        type: 'progress_milestone',
        title: 'Almost Done! 🎯',
        message: 'Fantastic! You\'re in the final stretch',
        priority: 'high',
        timestamp: new Date().toISOString(),
        action: {
          label: 'Finish Strong',
          onClick: () => console.log('Complete project')
        }
      })
    }

    // Check for upcoming deadlines
    const upcomingDeadlines = tasks.filter(t => {
      if (!t.due_date || t.status === 'completed') return false
      const dueDate = new Date(t.due_date)
      const now = new Date()
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntilDue <= 3 && daysUntilDue > 0
    })

    if (upcomingDeadlines.length > 0) {
      newNotifications.push({
        id: 'deadline-approaching',
        type: 'deadline_approaching',
        title: 'Deadlines Approaching',
        message: `${upcomingDeadlines.length} task${upcomingDeadlines.length > 1 ? 's' : ''} due within 3 days`,
        priority: 'high',
        timestamp: new Date().toISOString(),
        action: {
          label: 'Review Schedule',
          onClick: () => console.log('Review upcoming deadlines')
        }
      })
    }

    // Check for velocity changes
    const velocity = calculateVelocity()
    if (velocity > 1.5) {
      newNotifications.push({
        id: 'high-velocity',
        type: 'velocity_change',
        title: 'High Velocity! ⚡',
        message: `You're completing ${velocity.toFixed(1)} tasks per day. Great pace!`,
        priority: 'low',
        timestamp: new Date().toISOString(),
        action: {
          label: 'Maintain Pace',
          onClick: () => console.log('Maintain current pace')
        }
      })
    }

    setNotifications(newNotifications)
  }

  const calculateOverallProgress = () => {
    if (tasks.length === 0) return 0
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    return Math.round((completedTasks / tasks.length) * 100)
  }

  const calculateVelocity = () => {
    const completedTasks = tasks.filter(t => t.status === 'completed')
    if (completedTasks.length === 0) return 0
    
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const recentCompleted = completedTasks.filter(t => 
      new Date(t.completed_at || t.updated_at) > weekAgo
    ).length
    
    return recentCompleted / 7
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, dismissed: true } : n
    ))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'milestone_completed': return Award
      case 'task_overdue': return AlertTriangle
      case 'progress_milestone': return Target
      case 'velocity_change': return TrendingUp
      case 'deadline_approaching': return Clock
      default: return Bell
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const visibleNotifications = showAll 
    ? notifications.filter(n => !n.dismissed)
    : notifications.filter(n => !n.dismissed).slice(0, 3)

  if (notifications.length === 0) {
    return null
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <span>Smart Notifications</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {notifications.filter(n => !n.dismissed).length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleNotifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type)
          return (
            <div 
              key={notification.id}
              className={`p-4 rounded-lg border-l-4 ${getPriorityColor(notification.priority)}`}
            >
              <div className="flex items-start space-x-3">
                <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{notification.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(notification.timestamp).toLocaleString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      {notification.action && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7"
                          onClick={notification.action.onClick}
                        >
                          {notification.action.label}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dismissNotification(notification.id)}
                        className="text-xs h-7 text-gray-500 hover:text-gray-700"
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {notifications.filter(n => !n.dismissed).length > 3 && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showAll ? 'Show Less' : `Show All ${notifications.filter(n => !n.dismissed).length} Notifications`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
