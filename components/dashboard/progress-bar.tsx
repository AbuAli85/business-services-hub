'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp, 
  Target, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  BarChart3
} from 'lucide-react'

interface ProgressBarProps {
  overallProgress: number
  totalMilestones: number
  completedMilestones: number
  overdueCount?: number
  estimatedCompletion?: string
  className?: string
}

export function ProgressBar({ 
  overallProgress, 
  totalMilestones, 
  completedMilestones, 
  overdueCount = 0,
  estimatedCompletion,
  className = ""
}: ProgressBarProps) {
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    if (progress >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return 'Completed'
    if (progress >= 75) return 'Almost Done'
    if (progress >= 50) return 'In Progress'
    if (progress >= 25) return 'Getting Started'
    return 'Just Started'
  }

  const getStatusIcon = (progress: number) => {
    if (progress >= 100) return <CheckCircle2 className="h-4 w-4" />
    if (progress >= 50) return <TrendingUp className="h-4 w-4" />
    return <Target className="h-4 w-4" />
  }

  return (
    <Card className={`border-0 shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span>Monthly Progress Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(overallProgress)}
              <span className="font-medium text-gray-900">
                {getProgressStatus(overallProgress)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {overallProgress}%
              </span>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {overdueCount} Overdue
                </Badge>
              )}
            </div>
          </div>
          
          <Progress 
            value={overallProgress} 
            className="h-3"
            style={{
              '--progress-background': getProgressColor(overallProgress)
            } as React.CSSProperties}
          />
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>Started</span>
            <span>In Progress</span>
            <span>Review</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Milestone Statistics */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Milestones</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {completedMilestones}/{totalMilestones}
            </div>
            <div className="text-xs text-gray-500">
              {totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0}% Complete
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Timeline</span>
            </div>
            <div className="text-sm font-bold text-green-600">
              {estimatedCompletion || 'TBD'}
            </div>
            <div className="text-xs text-gray-500">
              Est. Completion
            </div>
          </div>
        </div>

        {/* Progress Insights */}
        {overallProgress > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Current Status:</span>
              <Badge 
                className={`${
                  overallProgress >= 100 ? 'bg-green-100 text-green-800' :
                  overallProgress >= 75 ? 'bg-blue-100 text-blue-800' :
                  overallProgress >= 50 ? 'bg-yellow-100 text-yellow-800' :
                  overallProgress >= 25 ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}
              >
                {getProgressStatus(overallProgress)}
              </Badge>
            </div>
          </div>
        )}

        {/* Overdue Warning */}
        {overdueCount > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <span className="font-medium">{overdueCount} milestone{overdueCount !== 1 ? 's' : ''} overdue</span>
                <p className="text-xs text-red-600 mt-1">
                  Please review and update progress to stay on track
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
