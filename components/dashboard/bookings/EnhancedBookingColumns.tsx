import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/StatusPill'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Eye, 
  Calendar, 
  MessageSquare, 
  FileText, 
  User,
  Building,
  ExternalLink
} from 'lucide-react'
import { formatMuscat } from '@/lib/dates'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BookingFullData {
  id: string
  title: string
  service_title: string
  service_category?: string
  client_name: string
  client_company?: string
  client_avatar?: string
  provider_name: string
  provider_company?: string
  normalized_status: string
  calculated_progress_percentage: number
  total_milestones: number
  completed_milestones: number
  payment_status: string
  invoice_status?: string
  amount?: number
  amount_cents?: number
  currency: string
  created_at: string
  updated_at?: string
  service_id: string
  client_id: string
  provider_id: string
  invoice_id?: string
}

interface ColumnProps {
  booking: BookingFullData
  userRole?: string
  onViewDetails?: () => void
  onViewMilestones?: () => void
  onViewInvoice?: () => void
  onMessageClient?: () => void
}

// Service Column Component
export function ServiceColumn({ booking }: ColumnProps) {
  // Provide more meaningful service titles when data is generic
  const getServiceTitle = () => {
    if (booking.service_title && booking.service_title !== 'Service') {
      return booking.service_title
    }
    if (booking.title && booking.title !== 'Service') {
      return booking.title
    }
    // Generate a more descriptive title based on service ID or other data
    return `Service #${booking.service_id.slice(-6)}`
  }
  
  const serviceTitle = getServiceTitle()
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Link 
          href={`/dashboard/services/${booking.service_id}`}
          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors flex items-center gap-1"
        >
          {serviceTitle}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </Link>
      </div>
      {booking.service_category && booking.service_category !== '' && (
        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block">
          {booking.service_category}
        </div>
      )}
    </div>
  )
}

// Client Column Component
export function ClientColumn({ booking }: ColumnProps) {
  // Provide more meaningful client names when data is generic
  const getClientName = () => {
    if (booking.client_name && booking.client_name !== 'Client') {
      return booking.client_name
    }
    // Generate a more descriptive name based on client ID
    return `Client #${booking.client_id.slice(-6)}`
  }
  
  const clientName = getClientName()
  const clientCompany = booking.client_company
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={booking.client_avatar} alt={clientName} />
          <AvatarFallback className="text-xs">
            {clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link 
            href={`/dashboard/clients/${booking.client_id}`}
            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors truncate block"
            title={clientName}
          >
            {clientName}
          </Link>
          {clientCompany && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Building className="h-3 w-3" />
              <span className="truncate" title={clientCompany}>
                {clientCompany}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Status Column Component
export function StatusColumn({ booking }: ColumnProps) {
  return (
    <div className="flex flex-col gap-1">
      <StatusPill status={booking.normalized_status} size="sm" />
      {booking.updated_at && booking.updated_at !== booking.created_at && (
        <div className="text-xs text-gray-500">
          Updated {formatMuscat(booking.updated_at)}
        </div>
      )}
    </div>
  )
}

// Progress Column Component
export function ProgressColumn({ booking }: ColumnProps) {
  const progress = booking.calculated_progress_percentage
  const totalMilestones = booking.total_milestones
  const completedMilestones = booking.completed_milestones
  
  const getProgressLabel = (progress: number, totalMilestones: number) => {
    if (totalMilestones === 0) return 'Not Started'
    if (progress === 0) return 'Getting Started'
    if (progress < 25) return 'Getting Started'
    if (progress < 50) return 'In Progress'
    if (progress < 75) return 'Making Progress'
    if (progress < 100) return 'Near Completion'
    return 'Completed'
  }

  const getProgressColor = (progress: number) => {
    if (progress === 100) return 'bg-emerald-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress > 0) return 'bg-amber-500'
    return 'bg-gray-300'
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Progress 
          value={progress} 
          className="h-2"
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">{progress}%</span>
          <span className="text-gray-500">
            {getProgressLabel(progress, totalMilestones)}
          </span>
        </div>
      </div>
      
      {totalMilestones > 0 && (
        <div className="text-xs text-gray-500">
          {completedMilestones}/{totalMilestones} milestones
        </div>
      )}
    </div>
  )
}

// Payment Column Component
export function PaymentColumn({ booking }: ColumnProps) {
  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Paid', icon: '✓' }
      case 'pending':
        return { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Pending', icon: '⏳' }
      case 'invoiced':
        return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Invoiced', icon: '📄' }
      case 'no_invoice':
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'No Invoice', icon: '—' }
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Unknown', icon: '?' }
    }
  }

  const config = getPaymentStatusConfig(booking.payment_status)

  return (
    <div className="space-y-1">
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </div>
      {booking.invoice_status && booking.invoice_status !== booking.payment_status && (
        <div className="text-xs text-gray-500">
          Invoice: {booking.invoice_status}
        </div>
      )}
    </div>
  )
}

// Amount Column Component
export function AmountColumn({ booking }: ColumnProps) {
  const amount = booking.amount_cents ? booking.amount_cents / 100 : booking.amount || 0
  const currency = booking.currency || 'OMR'
  
  return (
    <div className="text-right">
      <div className="font-semibold text-gray-900">
        {formatCurrency(amount, currency)}
      </div>
      {booking.amount_cents && (
        <div className="text-xs text-gray-500">
          {booking.amount_cents.toLocaleString()} cents
        </div>
      )}
    </div>
  )
}

// Created Column Component
export function CreatedColumn({ booking }: ColumnProps) {
  return (
    <div className="text-sm">
      <div className="text-gray-900">
        {formatMuscat(booking.created_at)}
      </div>
      <div className="text-gray-500">
        {new Date(booking.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}

// Actions Column Component
export function ActionsColumn({ booking, userRole, onViewDetails, onViewMilestones, onViewInvoice, onMessageClient }: ColumnProps) {
  return (
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

      {booking.invoice_id && (
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
  )
}
