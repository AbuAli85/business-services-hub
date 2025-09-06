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
  Timer
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Circular Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Progress</p>
              <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
              {estimatedCompletion && (
                <p className="text-xs text-gray-500 mt-1">
                  Est. completion: {estimatedCompletion}
                </p>
              )}
            </div>
            <TooltipProvider>
              <Tooltip content="Overall project completion percentage">
                <TooltipTrigger>
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-gray-200"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-blue-600"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={`${overallProgress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Completed Milestones */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedMilestones}</p>
              <p className="text-xs text-gray-500 mt-1">
                of {totalMilestones} milestones
              </p>
            </div>
            <TooltipProvider>
              <Tooltip content="Number of completed milestones">
                <TooltipTrigger>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Remaining Milestones */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remaining</p>
              <p className="text-2xl font-bold text-orange-600">{remainingMilestones}</p>
              <p className="text-xs text-gray-500 mt-1">
                milestones to go
              </p>
            </div>
            <TooltipProvider>
              <Tooltip content="Number of remaining milestones">
                <TooltipTrigger>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Hours Logged */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hours Logged</p>
              <p className="text-2xl font-bold text-purple-600">
                {totalActualHours.toFixed(1)}h
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-gray-500">
                  of {totalEstimatedHours.toFixed(1)}h estimated
                </p>
                {efficiency > 0 && (
                  <Badge 
                    variant={efficiency <= 100 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {efficiency.toFixed(0)}%
                  </Badge>
                )}
              </div>
            </div>
            <TooltipProvider>
              <Tooltip content="Total hours logged vs estimated">
                <TooltipTrigger>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Timer className="h-6 w-6 text-purple-600" />
                  </div>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}