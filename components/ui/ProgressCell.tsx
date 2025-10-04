'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react'

interface ProgressCellProps {
  progress: number
  totalMilestones?: number
  completedMilestones?: number
  size?: 'sm' | 'md' | 'lg'
  showMilestones?: boolean
  showTrend?: boolean
  previousProgress?: number
  className?: string
}

const SIZE_CLASSES = {
  sm: {
    progress: 'h-1.5',
    text: 'text-xs',
    icon: 'h-3 w-3'
  },
  md: {
    progress: 'h-2',
    text: 'text-sm',
    icon: 'h-4 w-4'
  },
  lg: {
    progress: 'h-3',
    text: 'text-base',
    icon: 'h-5 w-5'
  }
}

export function ProgressCell({ 
  progress, 
  totalMilestones = 0,
  completedMilestones = 0,
  size = 'md',
  showMilestones = true,
  showTrend = false,
  previousProgress,
  className
}: ProgressCellProps) {
  const progressValue = Math.max(0, Math.min(100, progress || 0))
  
  const getProgressLabel = (progress: number) => {
    if (progress === 0) return 'Getting Started'
    if (progress < 25) return 'Getting Started'
    if (progress < 50) return 'In Progress'
    if (progress < 75) return 'Making Progress'
    if (progress < 100) return 'Nearly Done'
    return 'Completed'
  }

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-emerald-500'
    if (progress >= 75) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 25) return 'bg-amber-500'
    if (progress > 0) return 'bg-orange-500'
    return 'bg-gray-300'
  }

  const getTrendIcon = () => {
    if (!showTrend || previousProgress === undefined) return null
    
    const diff = progressValue - previousProgress
    if (diff > 0) return <TrendingUp className={cn(SIZE_CLASSES[size].icon, 'text-green-500')} />
    if (diff < 0) return <TrendingDown className={cn(SIZE_CLASSES[size].icon, 'text-red-500')} />
    return <Minus className={cn(SIZE_CLASSES[size].icon, 'text-gray-400')} />
  }

  const getStatusIcon = () => {
    if (progressValue === 100) return <CheckCircle className={cn(SIZE_CLASSES[size].icon, 'text-emerald-500')} />
    if (progressValue > 0) return <Target className={cn(SIZE_CLASSES[size].icon, 'text-blue-500')} />
    return <Clock className={cn(SIZE_CLASSES[size].icon, 'text-gray-400')} />
  }

  const sizeClasses = SIZE_CLASSES[size]

  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={cn('font-semibold text-gray-700', sizeClasses.text)}>
            {progressValue}%
          </span>
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            {getTrendIcon()}
          </div>
        </div>
        
        <Progress 
          value={progressValue} 
          className={cn(sizeClasses.progress, 'transition-all duration-300')}
        />
        
        <div className="flex items-center justify-between">
          <span className={cn('text-gray-500', sizeClasses.text)}>
            {getProgressLabel(progressValue)}
          </span>
          {showTrend && previousProgress !== undefined && (
            <span className={cn('text-gray-400', sizeClasses.text)}>
              {previousProgress}%
            </span>
          )}
        </div>
      </div>
      
      {/* Milestones Info */}
      {showMilestones && totalMilestones > 0 && (
        <div className={cn('text-gray-500 flex items-center gap-1', sizeClasses.text)}>
          <span className="font-medium">{completedMilestones}/{totalMilestones}</span>
          <span>milestones</span>
        </div>
      )}
      
      {showMilestones && totalMilestones === 0 && (
        <div className={cn('text-gray-400', sizeClasses.text)}>
          No milestones yet
        </div>
      )}
    </div>
  )
}

// Export helper functions for use in other components
export function getProgressLabel(progress: number): string {
  if (progress === 0) return 'Getting Started'
  if (progress < 25) return 'Getting Started'
  if (progress < 50) return 'In Progress'
  if (progress < 75) return 'Making Progress'
  if (progress < 100) return 'Nearly Done'
  return 'Completed'
}

export function getProgressColor(progress: number): string {
  if (progress === 100) return 'bg-emerald-500'
  if (progress >= 75) return 'bg-green-500'
  if (progress >= 50) return 'bg-blue-500'
  if (progress >= 25) return 'bg-amber-500'
  if (progress > 0) return 'bg-orange-500'
  return 'bg-gray-300'
}
