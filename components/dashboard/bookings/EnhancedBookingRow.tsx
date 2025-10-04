import React from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatusPill } from '@/components/ui/StatusPill'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Eye, 
  Calendar, 
  MessageSquare, 
  FileText, 
  MoreHorizontal,
  User,
  DollarSign
} from 'lucide-react'
import { formatMuscat } from '@/lib/dates'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface EnhancedBookingRowProps {
  booking: {
    id: string
    title?: string
    service_title?: string
    client_name?: string
    provider_name?: string
    status: string
    progress_percentage?: number
    amount_cents?: number
    amount?: number
    currency?: string
    created_at: string
    scheduled_date?: string
    invoice_status?: string
  }
  isSelected?: boolean
  onSelect?: (checked: boolean) => void
  onViewDetails?: () => void
  onViewMilestones?: () => void
  onViewInvoice?: () => void
  onMessageClient?: () => void
  density?: 'compact' | 'comfortable' | 'spacious'
  userRole?: string
}

export function EnhancedBookingRow({
  booking,
  isSelected = false,
  onSelect,
  onViewDetails,
  onViewMilestones,
  onViewInvoice,
  onMessageClient,
  density = 'comfortable',
  userRole
}: EnhancedBookingRowProps) {
  const serviceTitle = booking.title || booking.service_title || 'Service Booking'
  const clientName = booking.client_name || 'Unknown Client'
  const amount = booking.amount_cents ? booking.amount_cents / 100 : booking.amount || 0
  const currency = booking.currency || 'OMR'
  const progress = Math.max(0, Math.min(100, booking.progress_percentage || 0))
  
  const getProgressLabel = (status: string, progress: number) => {
    if (progress === 0) return 'Getting Started'
    if (progress < 100) return 'In Progress'
    return 'Completed'
  }

  const densityClasses = {
    compact: 'py-2 text-xs',
    comfortable: 'py-3 text-sm',
    spacious: 'py-4 text-base'
  }

  return (
    <div className={cn(
      'border-b border-gray-100 hover:bg-gray-50 transition-colors',
      densityClasses[density]
    )}>
      <div className="grid grid-cols-12 gap-4 items-center px-4">
        {/* Selection Checkbox */}
        {onSelect && (
          <div className="col-span-1 flex items-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
          </div>
        )}

        {/* Service Information */}
        <div className={cn(
          'col-span-3',
          !onSelect && 'col-span-4'
        )}>
          <div className="space-y-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {serviceTitle}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <User className="h-3 w-3" />
              <span className="truncate">{clientName}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{formatMuscat(booking.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="col-span-2">
          <StatusPill status={booking.status} size="sm" />
        </div>

        {/* Progress */}
        <div className="col-span-2">
          <div className="space-y-1">
            <Progress 
              value={progress} 
              className="h-2"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">{progress}%</span>
              <span className="text-xs text-gray-500">
                {getProgressLabel(booking.status, progress)}
              </span>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="col-span-2 text-right">
          <div className="space-y-1">
            <div className="font-semibold text-gray-900">
              {formatCurrency(amount, currency)}
            </div>
            {booking.invoice_status && (
              <div className="text-xs">
                <StatusPill 
                  status={booking.invoice_status} 
                  size="sm" 
                  showIcon={false}
                  className="bg-blue-100 text-blue-800"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewDetails}
              className="h-8 w-8 p-0"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewMilestones}
              className="h-8 w-8 p-0"
              title="View Milestones"
            >
              <Calendar className="h-4 w-4" />
            </Button>

            {booking.invoice_status && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onViewInvoice}
                className="h-8 w-8 p-0"
                title="View Invoice"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}

            {userRole === 'provider' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onMessageClient}
                className="h-8 w-8 p-0"
                title="Message Client"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
