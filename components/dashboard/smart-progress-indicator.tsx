'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  Zap,
  BarChart3,
  Activity,
  Award
} from 'lucide-react'

interface SmartProgressIndicatorProps {
  bookingId: string
  currentProgress: number
  milestones: any[]
  tasks: any[]
  userRole: 'provider' | 'client'
  onProgressUpdate?: (progress: number) => void
}

export function SmartProgressIndicator({
  bookingId,
  currentProgress,
  milestones = [],
  tasks = [],
  userRole,
  onProgressUpdate
}: SmartProgressIndicatorProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)
  const [insights, setInsights] = useState<any[]>([])
  const [trending, setTrending] = useState<'up' | 'down' | 'stable'>('stable')

  // Calculate smart metrics
  const totalMilestones = milestones.length
  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false
    return new Date(t.due_date) < new Date()
  }).length

  // Calculate estimated completion
  const estimatedCompletion = calculateEstimatedCompletion(milestones, tasks)
  
  // Calculate velocity (tasks completed per day)
  const velocity = calculateVelocity(tasks)
  
  // Generate smart insights
  useEffect(() => {
    generateInsights()
  }, [milestones, tasks, currentProgress])

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(currentProgress)
    }, 300)
    return () => clearTimeout(timer)
  }, [currentProgress])

  const calculateEstimatedCompletion = (milestones: any[], tasks: any[]) => {
    if (milestones.length === 0) return null
    
    const avgTaskDuration = 2 // days
    const remainingTasks = tasks.filter(t => t.status !== 'completed').length
    const estimatedDays = remainingTasks * avgTaskDuration
    
    const completionDate = new Date()
    completionDate.setDate(completionDate.getDate() + estimatedDays)
    
    return completionDate
  }

  const calculateVelocity = (tasks: any[]) => {
    const completedTasks = tasks.filter(t => t.status === 'completed')
    if (completedTasks.length === 0) return 0
    
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const recentCompleted = completedTasks.filter(t => 
      new Date(t.completed_at || t.updated_at) > weekAgo
    ).length
    
    return recentCompleted / 7 // tasks per day
  }

  const generateInsights = () => {
    const newInsights = []
    
    // Progress insights
    if (currentProgress === 0) {
      newInsights.push({
        type: 'info',
        icon: Target,
        title: 'Project Ready to Start',
        message: 'All milestones are set up. Ready to begin work!',
        action: 'Start First Task'
      })
    } else if (currentProgress > 0 && currentProgress < 25) {
      newInsights.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Great Start!',
        message: 'Project is off to a good start. Keep the momentum going!',
        action: 'View Tasks'
      })
    } else if (currentProgress >= 25 && currentProgress < 50) {
      newInsights.push({
        type: 'info',
        icon: Activity,
        title: 'Making Progress',
        message: 'You\'re making steady progress. Consider reviewing upcoming milestones.',
        action: 'Review Timeline'
      })
    } else if (currentProgress >= 50 && currentProgress < 75) {
      newInsights.push({
        type: 'warning',
        icon: Clock,
        title: 'Halfway Point',
        message: 'You\'re halfway there! Time to push for the finish line.',
        action: 'Accelerate Progress'
      })
    } else if (currentProgress >= 75 && currentProgress < 100) {
      newInsights.push({
        type: 'success',
        icon: Award,
        title: 'Almost There!',
        message: 'Excellent work! You\'re in the final stretch.',
        action: 'Complete Project'
      })
    }

    // Overdue tasks insight
    if (overdueTasks > 0) {
      newInsights.push({
        type: 'error',
        icon: AlertTriangle,
        title: `${overdueTasks} Overdue Task${overdueTasks > 1 ? 's' : ''}`,
        message: 'Some tasks are past their due date. Consider prioritizing them.',
        action: 'Review Overdue'
      })
    }

    // Velocity insights
    if (velocity > 0) {
      if (velocity > 1) {
        newInsights.push({
          type: 'success',
          icon: TrendingUp,
          title: 'High Velocity',
          message: `Completing ${velocity.toFixed(1)} tasks per day. Great pace!`,
          action: 'Maintain Pace'
        })
      } else if (velocity < 0.5) {
        newInsights.push({
          type: 'warning',
          icon: Clock,
          title: 'Slow Progress',
          message: 'Consider increasing task completion rate to meet deadlines.',
          action: 'Increase Pace'
        })
      }
    }

    setInsights(newInsights)
  }

  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-200'
    if (progress < 25) return 'bg-red-500'
    if (progress < 50) return 'bg-orange-500'
    if (progress < 75) return 'bg-yellow-500'
    if (progress < 100) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getProgressStatus = (progress: number) => {
    if (progress === 0) return 'Not Started'
    if (progress < 25) return 'Getting Started'
    if (progress < 50) return 'In Progress'
    if (progress < 75) return 'Almost There'
    if (progress < 100) return 'Nearly Complete'
    return 'Completed'
  }

  const getProgressIcon = (progress: number) => {
    if (progress === 0) return Target
    if (progress < 25) return Clock
    if (progress < 50) return Activity
    if (progress < 75) return TrendingUp
    if (progress < 100) return Award
    return CheckCircle
  }

  const ProgressIcon = getProgressIcon(currentProgress)

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ProgressIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Smart Progress Tracking</h3>
                <p className="text-sm text-gray-600">
                  {getProgressStatus(currentProgress)} • {completedMilestones}/{totalMilestones} milestones
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{animatedProgress}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <Progress 
              value={animatedProgress} 
              className="h-3 mb-2"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-xs text-gray-600">Tasks Done</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{totalTasks - completedTasks}</div>
              <div className="text-xs text-gray-600">Remaining</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600">{overdueTasks}</div>
              <div className="text-xs text-gray-600">Overdue</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{velocity.toFixed(1)}</div>
              <div className="text-xs text-gray-600">Tasks/Day</div>
            </div>
          </div>

          {/* Estimated Completion */}
          {estimatedCompletion && (
            <div className="mt-4 p-3 bg-white rounded-lg shadow-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Estimated completion:</span>
                <span className="text-sm font-medium text-gray-900">
                  {estimatedCompletion.toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Zap className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">Smart Insights</h3>
            </div>
            <div className="space-y-3">
              {insights.map((insight, index) => {
                const Icon = insight.icon
                return (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.type === 'success' ? 'bg-green-50 border-green-400' :
                      insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                      insight.type === 'error' ? 'bg-red-50 border-red-400' :
                      'bg-blue-50 border-blue-400'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${
                        insight.type === 'success' ? 'text-green-600' :
                        insight.type === 'warning' ? 'text-yellow-600' :
                        insight.type === 'error' ? 'text-red-600' :
                        'text-blue-600'
                      }`} />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                        {insight.action && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 text-xs"
                          >
                            {insight.action}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Analytics */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Progress Analytics</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0}%
              </div>
              <div className="text-sm text-purple-600">Milestone Progress</div>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%
              </div>
              <div className="text-sm text-indigo-600">Task Completion</div>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <div className="text-2xl font-bold text-pink-600">
                {overdueTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0}%
              </div>
              <div className="text-sm text-pink-600">Overdue Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
