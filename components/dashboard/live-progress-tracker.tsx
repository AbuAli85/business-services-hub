'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  Play, 
  Pause, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Zap, 
  Target,
  RefreshCw,
  Eye,
  MessageSquare,
  Calendar,
  Timer,
  Award,
  Star,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { format, isAfter, isBefore, differenceInMinutes, differenceInHours } from 'date-fns'
import { Milestone, Task, UserRole } from '@/types/progress'

interface LiveProgressTrackerProps {
  milestones: Milestone[]
  userRole: UserRole
  onMilestoneUpdate?: (milestoneId: string, updates: Partial<Milestone>) => void
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void
  timeEntries?: any[]
  className?: string
}

interface LiveActivity {
  id: string
  type: 'milestone_completed' | 'task_completed' | 'milestone_started' | 'task_started' | 'comment_added' | 'approval_given' | 'time_logged'
  title: string
  description: string
  timestamp: Date
  user?: string
  milestoneId?: string
  taskId?: string
  icon: React.ReactNode
  color: string
}

export function LiveProgressTracker({
  milestones,
  userRole,
  onMilestoneUpdate,
  onTaskUpdate,
  timeEntries = [],
  className = ""
}: LiveProgressTrackerProps) {
  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([])
  const [isLive, setIsLive] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [progressMetrics, setProgressMetrics] = useState({
    currentProgress: 0,
    previousProgress: 0,
    progressChange: 0,
    tasksCompletedToday: 0,
    milestonesCompletedToday: 0,
    hoursLoggedToday: 0,
    efficiency: 0
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousMilestonesRef = useRef<Milestone[]>([])

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return

    const updateProgress = () => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      // Calculate current progress
      const totalMilestones = milestones.length
      const completedMilestones = milestones.filter(m => m.status === 'completed').length
      const currentProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
      
      // Calculate tasks completed today
      const allTasks = milestones.flatMap(m => m.tasks || [])
      const tasksCompletedToday = allTasks.filter(t => {
        if (t.status !== 'completed' || !t.completed_at) return false
        const completedDate = new Date(t.completed_at)
        return completedDate >= today
      }).length
      
      // Calculate milestones completed today
      const milestonesCompletedToday = milestones.filter(m => {
        if (m.status !== 'completed' || !m.completed_at) return false
        const completedDate = new Date(m.completed_at)
        return completedDate >= today
      }).length
      
      // Calculate hours logged today
      const hoursLoggedToday = timeEntries
        .filter(entry => {
          const entryDate = new Date(entry.created_at)
          return entryDate >= today
        })
        .reduce((sum, entry) => sum + (entry.duration || 0), 0)
      
      // Calculate efficiency (actual vs estimated time)
      const totalEstimatedHours = milestones.reduce((sum, m) => sum + (m.estimated_hours || 0), 0)
      const totalActualHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
      const efficiency = totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0
      
      // Detect changes and create activities
      const previousMilestones = previousMilestonesRef.current
      const newActivities: LiveActivity[] = []
      
      // Check for milestone changes
      milestones.forEach(milestone => {
        const previous = previousMilestones.find(p => p.id === milestone.id)
        if (!previous) return
        
        if (previous.status !== milestone.status) {
          if (milestone.status === 'completed') {
            newActivities.push({
              id: `milestone-completed-${milestone.id}-${Date.now()}`,
              type: 'milestone_completed',
              title: 'Milestone Completed! 🎉',
              description: `${milestone.title} has been completed`,
              timestamp: now,
              user: 'System',
              milestoneId: milestone.id,
              icon: <CheckCircle className="h-4 w-4" />,
              color: 'text-green-600 bg-green-50'
            })
          } else if (milestone.status === 'in_progress' && previous.status === 'pending') {
            newActivities.push({
              id: `milestone-started-${milestone.id}-${Date.now()}`,
              type: 'milestone_started',
              title: 'Milestone Started',
              description: `Work has begun on ${milestone.title}`,
              timestamp: now,
              user: 'System',
              milestoneId: milestone.id,
              icon: <Play className="h-4 w-4" />,
              color: 'text-blue-600 bg-blue-50'
            })
          }
        }
      })
      
      // Check for task changes
      milestones.forEach(milestone => {
        const previous = previousMilestones.find(p => p.id === milestone.id)
        if (!previous || !milestone.tasks || !previous.tasks) return
        
        milestone.tasks.forEach(task => {
          const previousTask = previous.tasks.find(p => p.id === task.id)
          if (!previousTask) return
          
          if (previousTask.status !== task.status && task.status === 'completed') {
            newActivities.push({
              id: `task-completed-${task.id}-${Date.now()}`,
              type: 'task_completed',
              title: 'Task Completed',
              description: `${task.title} in ${milestone.title}`,
              timestamp: now,
              user: 'System',
              milestoneId: milestone.id,
              taskId: task.id,
              icon: <CheckCircle className="h-4 w-4" />,
              color: 'text-green-600 bg-green-50'
            })
          }
        })
      })
      
      // Add some simulated activities for demo purposes
      if (Math.random() < 0.3) {
        const activities = [
          {
            id: `sim-${Date.now()}`,
            type: 'time_logged' as const,
            title: 'Time Logged',
            description: `${Math.round(Math.random() * 4 + 1)} hours logged on project work`,
            timestamp: now,
            user: 'Team Member',
            icon: <Timer className="h-4 w-4" />,
            color: 'text-purple-600 bg-purple-50'
          },
          {
            id: `sim-comment-${Date.now()}`,
            type: 'comment_added' as const,
            title: 'New Comment',
            description: 'Added feedback on current milestone',
            timestamp: now,
            user: 'Client',
            icon: <MessageSquare className="h-4 w-4" />,
            color: 'text-blue-600 bg-blue-50'
          }
        ]
        newActivities.push(activities[Math.floor(Math.random() * activities.length)])
      }
      
      // Update state
      setProgressMetrics(prev => ({
        currentProgress,
        previousProgress: prev.currentProgress,
        progressChange: currentProgress - prev.currentProgress,
        tasksCompletedToday,
        milestonesCompletedToday,
        hoursLoggedToday,
        efficiency
      }))
      
      if (newActivities.length > 0) {
        setLiveActivities(prev => [...newActivities, ...prev].slice(0, 20)) // Keep last 20 activities
      }
      
      setLastUpdate(now)
      previousMilestonesRef.current = [...milestones]
    }
    
    // Initial update
    updateProgress()
    
    // Set up interval for live updates
    intervalRef.current = setInterval(updateProgress, 5000) // Update every 5 seconds
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [milestones, isLive, timeEntries])

  const getProgressChangeIcon = () => {
    if (progressMetrics.progressChange > 0) return <ArrowUp className="h-4 w-4 text-green-600" />
    if (progressMetrics.progressChange < 0) return <ArrowDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getProgressChangeColor = () => {
    if (progressMetrics.progressChange > 0) return 'text-green-600'
    if (progressMetrics.progressChange < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const minutes = differenceInMinutes(now, timestamp)
    const hours = differenceInHours(now, timestamp)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return format(timestamp, 'MMM dd, HH:mm')
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Live Status Header */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <CardTitle className="text-lg">Live Progress Tracker</CardTitle>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-200">
                {isLive ? 'LIVE' : 'PAUSED'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLive(!isLive)}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLive ? 'animate-spin' : ''}`} />
                {isLive ? 'Pause' : 'Resume'}
              </Button>
              <span className="text-xs text-gray-500">
                Last update: {formatTimeAgo(lastUpdate)}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Current Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Current Progress</span>
                <div className="flex items-center gap-1">
                  {getProgressChangeIcon()}
                  <span className={`text-lg font-bold ${getProgressChangeColor()}`}>
                    {progressMetrics.currentProgress}%
                  </span>
                </div>
              </div>
              <Progress value={progressMetrics.currentProgress} className="h-2" />
              {progressMetrics.progressChange !== 0 && (
                <div className={`text-xs ${getProgressChangeColor()}`}>
                  {progressMetrics.progressChange > 0 ? '+' : ''}{progressMetrics.progressChange}% from last update
                </div>
              )}
            </div>

            {/* Tasks Today */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Tasks Today</span>
                <span className="text-lg font-bold text-blue-600">{progressMetrics.tasksCompletedToday}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <CheckCircle className="h-3 w-3" />
                <span>Completed</span>
              </div>
            </div>

            {/* Milestones Today */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Milestones Today</span>
                <span className="text-lg font-bold text-green-600">{progressMetrics.milestonesCompletedToday}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Award className="h-3 w-3" />
                <span>Completed</span>
              </div>
            </div>

            {/* Hours Logged */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Hours Today</span>
                <span className="text-lg font-bold text-purple-600">{progressMetrics.hoursLoggedToday.toFixed(1)}h</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Timer className="h-3 w-3" />
                <span>Logged</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {liveActivities.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-full ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                      <span className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    {activity.user && (
                      <p className="text-xs text-gray-500 mt-1">by {activity.user}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No recent activity</p>
              <p className="text-sm">Activities will appear here as work progresses</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Efficiency</p>
                <p className="text-2xl font-bold text-blue-600">{progressMetrics.efficiency}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">On Track</p>
                <p className="text-2xl font-bold text-green-600">
                  {progressMetrics.currentProgress >= 75 ? 'Yes' : 'Almost'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Zap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Momentum</p>
                <p className="text-2xl font-bold text-purple-600">
                  {progressMetrics.tasksCompletedToday > 0 ? 'High' : 'Building'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
