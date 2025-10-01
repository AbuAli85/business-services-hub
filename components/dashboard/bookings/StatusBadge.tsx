'use client'

import { Badge } from '@/components/ui/badge'
import { StatusPill } from '@/components/ui/StatusPill'
import { 
  CheckCircle, 
  Clock, 
  Play, 
  AlertTriangle, 
  XCircle, 
  Pause,
  Rocket,
  FileText,
  Target
} from 'lucide-react'

export interface StatusBadgeProps {
  status: string
  approval_status?: string
  progress_percentage?: number
  hasInvoice?: boolean
  invoiceStatus?: string
  className?: string
}

// Improved status derivation logic
export function getDerivedStatus(booking: {
  status: string
  approval_status?: string
  progress_percentage?: number
}, invoice?: { status: string }) {
  // Handle completed status first
  if (booking.status === 'completed') {
    return 'delivered'
  }
  
  // Handle in-progress status
  if (booking.status === 'in_progress') {
    return 'in_production'
  }
  
  // Check if ready to launch (has approved invoice)
  if (invoice && ['issued', 'paid'].includes(invoice.status)) {
    return 'ready_to_launch'
  }
  
  // Check approval status - prioritize approval_status over status
  if (booking.approval_status === 'approved') {
    return 'approved'
  }
  if (booking.status === 'approved') {
    return 'approved'
  }
  
  // Handle declined/cancelled
  if (booking.status === 'declined' || booking.approval_status === 'declined' || booking.status === 'cancelled') {
    return 'cancelled'
  }
  
  // Handle on hold
  if (booking.status === 'on_hold') {
    return 'on_hold'
  }
  
  // Default to pending review
  return 'pending_review'
}

export function getStatusConfig(derivedStatus: string) {
  switch (derivedStatus) {
    case 'delivered':
      return {
        label: 'Delivered',
        variant: 'default' as const,
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
        icon: CheckCircle,
        subtitle: 'Project successfully completed and delivered'
      }
    
    case 'in_production':
      return {
        label: 'In Production',
        variant: 'secondary' as const,
        className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
        icon: Play,
        subtitle: 'Active development in progress'
      }
    
    case 'ready_to_launch':
      return {
        label: 'Ready to Launch',
        variant: 'default' as const,
        className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
        icon: Rocket,
        subtitle: 'All prerequisites met • Ready to launch'
      }
    
    case 'approved':
      return {
        label: 'Approved',
        variant: 'default' as const,
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
        icon: Target,
        subtitle: 'Approved and ready for next steps'
      }
    
    case 'pending_review':
      return {
        label: 'Pending Review',
        variant: 'outline' as const,
        className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
        icon: Clock,
        subtitle: 'Awaiting provider approval'
      }
    
    case 'cancelled':
      return {
        label: 'Cancelled',
        variant: 'destructive' as const,
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
        icon: XCircle,
        subtitle: 'Project cancelled'
      }
    
    case 'on_hold':
      return {
        label: 'On Hold',
        variant: 'secondary' as const,
        className: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
        icon: Pause,
        subtitle: 'Project temporarily paused'
      }
    
    default:
      return {
        label: 'Unknown',
        variant: 'outline' as const,
        className: 'bg-gray-50 text-gray-600 border-gray-200',
        icon: AlertTriangle,
        subtitle: 'Status unknown'
      }
  }
}

export function StatusBadge({ 
  status, 
  approval_status, 
  progress_percentage, 
  hasInvoice, 
  invoiceStatus,
  className = '' 
}: StatusBadgeProps) {
  const booking = { status, approval_status, progress_percentage }
  const invoice = hasInvoice && invoiceStatus ? { status: invoiceStatus } : undefined
  
  const derivedStatus = getDerivedStatus(booking, invoice)
  const config = getStatusConfig(derivedStatus)
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2">
      {/* Unified visual via StatusPill */}
      <StatusPill status={derivedStatus} />
      
      {/* Progress indicator for in-production items */}
      {derivedStatus === 'in_production' && progress_percentage !== undefined && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, progress_percentage))}%` }}
            />
          </div>
          <span className="font-medium">{progress_percentage}%</span>
        </div>
      )}
    </div>
  )
}

export function StatusSubtitle({ 
  status, 
  approval_status, 
  hasInvoice, 
  invoiceStatus 
}: Omit<StatusBadgeProps, 'className'>) {
  const booking = { status, approval_status }
  const invoice = hasInvoice && invoiceStatus ? { status: invoiceStatus } : undefined
  
  const derivedStatus = getDerivedStatus(booking, invoice)
  const config = getStatusConfig(derivedStatus)
  
  return (
    <p className="text-xs text-gray-500 mt-1">
      {config.subtitle}
    </p>
  )
}
