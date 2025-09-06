'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Target, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  TrendingUp,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Sparkles
} from 'lucide-react'
import { addDays } from 'date-fns'
import { safeFormatDate } from '@/lib/date-utils'

interface MainProgressHeaderProps {
  bookingProgress: {
    booking_progress: number
    booking_title: string
    booking_status: string
  } | null
  completedMilestones: number
  totalMilestones: number
  completedTasks: number
  totalTasks: number
  totalEstimatedHours: number
  totalActualHours: number
  overdueTasks: number
}

export function MainProgressHeader({
  bookingProgress,
  completedMilestones,
  totalMilestones,
  completedTasks,
  totalTasks,
  totalEstimatedHours,
  totalActualHours,
  overdueTasks
}: MainProgressHeaderProps) {
  const overallProgress = bookingProgress?.booking_progress || 0
  const remainingMilestones = totalMilestones - completedMilestones
  const efficiency = totalEstimatedHours > 0 ? (totalActualHours / totalEstimatedHours) * 100 : 0

  // Calculate estimated completion date based on progress
  const getEstimatedCompletion = () => {
    if (overallProgress === 0) return null
    if (overallProgress >= 100) return 'Completed'
    
    const daysRemaining = Math.ceil((100 - overallProgress) / 10) // Rough estimate
    return safeFormatDate(addDays(new Date(), daysRemaining), 'MMM dd, yyyy')
  }

  const estimatedCompletion = getEstimatedCompletion()

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600'
    if (progress >= 60) return 'text-blue-600'
    if (progress >= 40) return 'text-yellow-600'
    if (progress >= 20) return 'text-orange-600'
    return 'text-red-600'
  }

  const getProgressBgColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-50 border-green-200'
    if (progress >= 60) return 'bg-blue-50 border-blue-200'
    if (progress >= 40) return 'bg-yellow-50 border-yellow-200'
    if (progress >= 20) return 'bg-orange-50 border-orange-200'
    return 'bg-red-50 border-red-200'
  }

  const getStatusMessage = () => {
    if (overallProgress === 0) return "Let's get started! 🚀"
    if (overallProgress < 25) return "Great beginning! 💪"
    if (overallProgress < 50) return "Making good progress! ⭐"
    if (overallProgress < 75) return "Almost there! 🔥"
    if (overallProgress < 100) return "Final stretch! 🎯"
    return "Project completed! 🎉"
  }

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className={`${getProgressBgColor(overallProgress)} border-2 transition-all duration-300 hover:shadow-lg`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Project Progress</h3>
              <p className="text-sm text-gray-600">{getStatusMessage()}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {bookingProgress?.booking_status?.replace('_', ' ').toUpperCase() || 'ACTIVE'}
              </Badge>
              {overdueTasks > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueTasks} Overdue
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Circular Progress */}
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${getProgressColor(overallProgress)} transition-all duration-1000 ease-out`}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={`${overallProgress}, 100`}
                    strokeLinecap="round"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${getProgressColor(overallProgress)}`}>
                    {overallProgress}%
                  </span>
                  <span className="text-xs text-gray-500">Complete</span>
                </div>
              </div>
              {estimatedCompletion && (
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Estimated Completion</p>
                  <p className="text-lg font-semibold text-gray-900">{estimatedCompletion}</p>
                </div>
              )}
            </div>

            {/* Milestones Progress */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-600" />
                Milestones
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">Completed</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">{completedMilestones}</span>
                    <span className="text-sm text-gray-500 ml-1">/{totalMilestones}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-gray-700">Remaining</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-orange-600">{remainingMilestones}</span>
                    <span className="text-sm text-gray-500 ml-1">to go</span>
                  </div>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">
                      {totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            {/* Time Tracking */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                <Timer className="h-5 w-5 mr-2 text-purple-600" />
                Time Tracking
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Logged</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {totalActualHours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Estimated</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {totalEstimatedHours.toFixed(1)}h
                  </span>
                </div>
                {efficiency > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Efficiency</span>
                      <span className={`font-medium ${efficiency <= 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {efficiency.toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(efficiency, 100)} 
                      className={`h-2 ${efficiency <= 100 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
                <p className="text-xl font-bold text-gray-900">
                  {completedTasks}/{totalTasks}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Project Health</p>
                <p className="text-xl font-bold text-green-600">
                  {overallProgress >= 80 ? 'Excellent' : 
                   overallProgress >= 60 ? 'Good' : 
                   overallProgress >= 40 ? 'Fair' : 'Needs Attention'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Days Active</p>
                <p className="text-xl font-bold text-gray-900">
                  {Math.max(1, Math.ceil((Date.now() - new Date('2025-08-25').getTime()) / (1000 * 60 * 60 * 24)))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}