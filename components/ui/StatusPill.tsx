import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Loader, Clock, Sparkles, AlertCircle, XCircle, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatusPillProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const statusConfig = {
  approved: {
    color: 'bg-green-500 text-white',
    icon: CheckCircle,
    label: 'Approved'
  },
  confirmed: {
    color: 'bg-green-500 text-white',
    icon: CheckCircle,
    label: 'Confirmed'
  },
  in_progress: {
    color: 'bg-blue-500 text-white',
    icon: Loader,
    label: 'In Progress'
  },
  pending: {
    color: 'bg-amber-500 text-white',
    icon: Clock,
    label: 'Pending'
  },
  pending_provider_approval: {
    color: 'bg-amber-500 text-white',
    icon: Clock,
    label: 'Pending Approval'
  },
  completed: {
    color: 'bg-emerald-600 text-white',
    icon: Sparkles,
    label: 'Completed'
  },
  cancelled: {
    color: 'bg-gray-500 text-white',
    icon: XCircle,
    label: 'Cancelled'
  },
  declined: {
    color: 'bg-red-500 text-white',
    icon: XCircle,
    label: 'Declined'
  },
  on_hold: {
    color: 'bg-orange-500 text-white',
    icon: Pause,
    label: 'On Hold'
  },
  draft: {
    color: 'bg-gray-400 text-white',
    icon: AlertCircle,
    label: 'Draft'
  }
}

const sizeConfig = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-2'
}

export function StatusPill({ 
  status, 
  size = 'sm', 
  showIcon = true, 
  className 
}: StatusPillProps) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, '_')
  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || {
    color: 'bg-gray-500 text-white',
    icon: AlertCircle,
    label: status || 'Unknown'
  }

  const Icon = config.icon

  return (
    <Badge 
      className={cn(
        config.color,
        sizeConfig[size],
        'font-medium border-0',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  )
}