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
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { formatMuscat } from '@/lib/dates'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface EnhancedBookingRowProps {
  booking: {
    id: string
    title?: string
    booking_title?: string
    service_title?: string
    client_name?: string
    provider_name?: string
    status: string
    display_status?: string
    progress_percentage?: number
    progress?: number
    amount_cents?: number
    amount?: number
    currency?: string
    created_at: string
    scheduled_date?: string
    invoice_status?: string
    payment_status?: string
    raw_status?: string
    total_milestones?: number
    completed_milestones?: number
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
  
  // Extract and normalize data
  const serviceTitle = booking.service_title || booking.booking_title || 'Untitled Service'
  const clientName = booking.client_name || 'Unknown Client'
  const progress = booking.progress_percentage ?? booking.progress ?? 0
  const amount = booking.amount || (booking.amount_cents ? booking.amount_cents / 100 : 0)
  const currency = booking.currency || 'USD'
  
  // ✅ CRITICAL FIX: Use display_status if available, fallback to raw status
  const displayStatus = booking.display_status || booking.status || 'pending'
  
  // Enhanced progress label
  const getProgressLabel = (status: string, progressValue: number) => {
    if (progressValue === 100) return 'Complete'
    if (progressValue >= 75) return 'Almost Done'
    if (progressValue >= 50) return 'Halfway'
    if (progressValue >= 25) return 'Started'
    if (progressValue > 0) return 'In Progress'
    return 'Not Started'
  }

  // Enhanced payment status display
  const getPaymentStatusDisplay = () => {
    const paymentStatus = booking.payment_status || booking.invoice_status || 'pending'
    
    switch (paymentStatus.toLowerCase()) {
      case 'paid':
        return {
          label: 'Paid',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle
        }
      case 'pending':
        return {
          label: 'Pending',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock
        }
      case 'failed':
        return {
          label: 'Failed',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle
        }
      case 'refunded':
        return {
          label: 'Refunded',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock
        }
      default:
        return {
          label: 'Pending',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock
        }
    }
  }

  const paymentStatus = getPaymentStatusDisplay()
  const PaymentIcon = paymentStatus.icon

  // Density-based styling
  const densityClasses = {
    compact: 'py-2 px-3 text-xs',
    comfortable: 'py-3 px-4 text-sm',
    spacious: 'py-4 px-5 text-base'
  }

  return (
    <div className={cn(
      'border-b border-gray-100 hover:bg-gray-50 transition-colors',
      densityClasses[density]
    )}>
      <div className="grid grid-cols-12 gap-4 items-center">
        
        {/* Selection Checkbox */}
        <div className="col-span-1">
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
          )}
        </div>

        {/* Service & Client Info */}
        <div className="col-span-3">
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

        {/* Status Column - Enhanced */}
        <div className="col-span-2">
          <div className="space-y-1">
            <StatusPill 
              status={displayStatus} 
              size="sm" 
              showIcon={true}
            />
            {/* Show raw status if different from display status */}
            {booking.raw_status && booking.raw_status !== displayStatus && (
              <div className="text-xs text-gray-500">
                Raw: {booking.raw_status}
              </div>
            )}
          </div>
        </div>

        {/* Progress Column - Enhanced */}
        <div className="col-span-2">
          <div className="space-y-1">
            <Progress 
              value={progress} 
              className="h-2"
              // Custom color based on progress
              style={{
                '--progress-background': progress === 100 ? '#10b981' : 
                                       progress >= 75 ? '#3b82f6' : 
                                       progress >= 50 ? '#f59e0b' : '#ef4444'
              } as React.CSSProperties}
            />
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-xs font-medium",
                progress === 100 ? "text-green-600" :
                progress >= 75 ? "text-blue-600" :
                progress >= 50 ? "text-yellow-600" : "text-red-600"
              )}>
                {progress}%
              </span>
              <span className="text-xs text-gray-500">
                {getProgressLabel(displayStatus, progress)}
              </span>
            </div>
            {/* Show milestone info if available */}
            {booking.total_milestones !== undefined && (
              <div className="text-xs text-gray-400">
                {booking.completed_milestones || 0}/{booking.total_milestones} milestones
              </div>
            )}
          </div>
        </div>

        {/* Payment Column - Enhanced */}
        <div className="col-span-2 text-right">
          <div className="space-y-1">
            <div className="font-semibold text-gray-900">
              {formatCurrency(amount, currency)}
            </div>
            <div className="flex items-center justify-end gap-1">
              <PaymentIcon className="h-3 w-3" />
              <span className={cn(
                "text-xs px-2 py-1 rounded-full border",
                paymentStatus.color
              )}>
                {paymentStatus.label}
              </span>
            </div>
            {/* Show invoice status if available */}
            {booking.invoice_status && booking.invoice_status !== paymentStatus.label && (
              <div className="text-xs text-gray-500">
                Invoice: {booking.invoice_status}
              </div>
            )}
          </div>
        </div>

        {/* Actions Column */}
        <div className="col-span-2">
          <div className="flex items-center gap-1 justify-end">
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

            {/* Show invoice button if there's payment info */}
            {(booking.invoice_status || booking.payment_status) && (
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

            {/* Show message button for providers */}
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