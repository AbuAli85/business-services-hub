'use client'

import React from 'react'
import { 
  CheckCircle, 
  Clock, 
  Loader2, 
  Sparkles, 
  XCircle, 
  AlertTriangle,
  Play,
  Pause,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusPillProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showIcon?: boolean
}

const STATUS_MAP = {
  pending_review: { 
    label: 'Pending Review', 
    color: 'bg-amber-100 text-amber-700 border-amber-200', 
    icon: Clock,
    description: 'Awaiting approval or review'
  },
  pending: { 
    label: 'Pending', 
    color: 'bg-amber-100 text-amber-700 border-amber-200', 
    icon: Clock,
    description: 'Awaiting approval or review'
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-green-100 text-green-700 border-green-200', 
    icon: CheckCircle,
    description: 'Approved and ready to start'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    icon: Loader2,
    description: 'Work is actively being done'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
    icon: Sparkles,
    description: 'Project completed successfully'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-gray-100 text-gray-700 border-gray-200', 
    icon: XCircle,
    description: 'Project was cancelled'
  },
  declined: { 
    label: 'Declined', 
    color: 'bg-red-100 text-red-700 border-red-200', 
    icon: XCircle,
    description: 'Project was declined'
  },
  paused: { 
    label: 'Paused', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
    icon: Pause,
    description: 'Project is temporarily paused'
  },
  ready_to_launch: { 
    label: 'Ready to Launch', 
    color: 'bg-purple-100 text-purple-700 border-purple-200', 
    icon: Target,
    description: 'All prerequisites met, ready to start'
  },
  in_production: { 
    label: 'In Production', 
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
    icon: Play,
    description: 'Work is in active production'
  },
  delivered: { 
    label: 'Delivered', 
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200', 
    icon: Sparkles,
    description: 'Project delivered to client'
  }
}

const SIZE_CLASSES = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
}

const ICON_SIZES = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
}

export function StatusPill({ 
  status, 
  size = 'md', 
  className,
  showIcon = true 
}: StatusPillProps) {
  const statusConfig = STATUS_MAP[status as keyof typeof STATUS_MAP] || STATUS_MAP['pending_review']
  const { label, color, icon: Icon, description } = statusConfig
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border shadow-sm transition-all duration-200',
        color,
        SIZE_CLASSES[size],
        className
      )}
      title={description}
    >
      {showIcon && <Icon className={cn(ICON_SIZES[size], 'flex-shrink-0')} />}
      <span className="truncate">{label}</span>
    </span>
  )
}

// Export the status map for use in other components
export { STATUS_MAP }

// Helper function to get status color for custom components
export function getStatusColor(status: string): string {
  const statusConfig = STATUS_MAP[status as keyof typeof STATUS_MAP] || STATUS_MAP['pending_review']
  return statusConfig.color
}

// Helper function to get status icon
export function getStatusIcon(status: string) {
  const statusConfig = STATUS_MAP[status as keyof typeof STATUS_MAP] || STATUS_MAP['pending_review']
  return statusConfig.icon
}
