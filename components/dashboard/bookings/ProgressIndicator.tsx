'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  Clock, 
  Play, 
  Target,
  TrendingUp
} from 'lucide-react'

export interface ProgressIndicatorProps {
  status: string
  approval_status?: string
  progress_percentage?: number
  milestones_completed?: number
  milestones_total?: number
  className?: string
}

function getProgressConfig(status: string, approval_status?: string, progress?: number) {
  // Determine actual progress based on status and explicit progress
  let actualProgress = progress || 0
  let progressColor = 'bg-blue-500'
  let statusIcon = Clock
  let statusText = 'Not Started'

  switch (status) {
    case 'completed':
      actualProgress = 100
      progressColor = 'bg-green-500'
      statusIcon = CheckCircle
      statusText = 'Completed'
      break
    
    case 'in_progress':
      actualProgress = Math.max(progress || 50, 10) // Ensure some progress is shown
      progressColor = 'bg-blue-500'
      statusIcon = Play
      statusText = 'In Progress'
      break
    
    case 'approved':
    case 'confirmed':
      if (approval_status === 'approved') {
        actualProgress = Math.max(progress || 25, 10)
        progressColor = 'bg-emerald-500'
        statusIcon = Target
        statusText = 'Approved'
      }
      break
    
    case 'pending':
      actualProgress = 0
      progressColor = 'bg-gray-400'
      statusIcon = Clock
      statusText = 'Pending'
      break
    
    case 'cancelled':
    case 'declined':
      actualProgress = 0
      progressColor = 'bg-red-500'
      statusIcon = Clock
      statusText = 'Cancelled'
      break
  }

  return {
    progress: Math.max(0, Math.min(100, actualProgress)),
    color: progressColor,
    icon: statusIcon,
    text: statusText
  }
}

export function ProgressIndicator({ 
  status, 
  approval_status, 
  progress_percentage, 
  milestones_completed = 0,
  milestones_total = 0,
  className = '' 
}: ProgressIndicatorProps) {
  const config = getProgressConfig(status, approval_status, progress_percentage)
  const Icon = config.icon

  // Calculate milestone progress if available
  const milestoneProgress = milestones_total > 0 
    ? Math.round((milestones_completed / milestones_total) * 100)
    : null

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress 
            value={config.progress} 
            className="h-2 bg-gray-200"
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Icon className="h-4 w-4" />
          <span>{config.progress}%</span>
        </div>
      </div>

      {/* Status and Milestone Info */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${config.color}`} />
          {config.text}
        </span>
        
        {milestoneProgress !== null && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {milestones_completed}/{milestones_total} milestones
          </span>
        )}
      </div>

      {/* Progress Details for In-Progress Items */}
      {status === 'in_progress' && config.progress > 0 && config.progress < 100 && (
        <div className="text-xs text-gray-500">
          {config.progress < 25 && "Project initiated • Requirements gathering"}
          {config.progress >= 25 && config.progress < 50 && "Development phase • Making good progress"}
          {config.progress >= 50 && config.progress < 75 && "Implementation phase • Nearing completion"}
          {config.progress >= 75 && config.progress < 100 && "Final phase • Quality assurance and testing"}
        </div>
      )}
    </div>
  )
}

export function CompactProgressIndicator({ 
  status, 
  approval_status, 
  progress_percentage,
  className = '' 
}: Omit<ProgressIndicatorProps, 'milestones_completed' | 'milestones_total'>) {
  const config = getProgressConfig(status, approval_status, progress_percentage)
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 max-w-20">
        <Progress 
          value={config.progress} 
          className="h-1.5 bg-gray-200"
        />
      </div>
      <div className="flex items-center gap-1 text-xs font-medium text-gray-600">
        <Icon className="h-3 w-3" />
        <span>{config.progress}%</span>
      </div>
    </div>
  )
}
