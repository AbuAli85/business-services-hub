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
  const [trending, setTrending] = useState<'up' | 'down' | 'stable'>('stable')

  // Helper functions
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
  

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(currentProgress)
    }, 300)
    return () => clearTimeout(timer)
  }, [currentProgress])

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

    </div>
  )
}
