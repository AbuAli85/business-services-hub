'use client'

import { CheckCircle, Target, Clock, AlertCircle } from 'lucide-react'
import { Milestone, BookingProgress } from '@/types/progress'
import { isMilestoneOverdue } from '@/lib/progress-calculations'

interface ProgressSummaryFooterProps {
  bookingProgress: BookingProgress | null
  milestones: Milestone[]
}

export function ProgressSummaryFooter({ bookingProgress, milestones }: ProgressSummaryFooterProps) {
  if (!bookingProgress) return null

  const completedMilestones = milestones.filter(m => m.status === 'completed').length
  const totalMilestones = milestones.length
  const remainingMilestones = totalMilestones - completedMilestones
  const overdueMilestones = milestones.filter(m => isMilestoneOverdue(m)).length

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-600">{bookingProgress.booking_progress}%</div>
            <span className="text-sm text-gray-600">Overall Progress</span>
          </div>
          
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="text-sm">
              <span className="font-semibold text-green-600">{completedMilestones}</span>
              <span className="text-gray-600"> completed</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <div className="text-sm">
              <span className="font-semibold text-blue-600">{remainingMilestones}</span>
              <span className="text-gray-600"> remaining</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{bookingProgress.total_actual_hours.toFixed(1)}h logged</span>
          </div>
          {overdueMilestones > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{overdueMilestones} overdue</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
