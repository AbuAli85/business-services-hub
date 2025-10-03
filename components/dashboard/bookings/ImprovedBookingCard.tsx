'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Calendar, 
  Clock, 
  User, 
  Building, 
  Eye,
  FileText,
  MessageSquare,
  BarChart3,
  MoreVertical,
  DollarSign,
  CheckCircle,
  Play,
  Edit,
  Download,
  Send,
  CreditCard,
  X
} from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { ProgressIndicator, CompactProgressIndicator } from './ProgressIndicator'
import { ServiceDisplay, ServiceTitle } from './ServiceDisplay'
import { AmountDisplay, CompactAmountDisplay } from './AmountDisplay'
import { ImprovedQuickActions } from './ImprovedQuickActions'

export interface ImprovedBookingCardProps {
  booking: any
  invoice?: any
  isSelected?: boolean
  onSelect?: (checked: boolean) => void
  onQuickAction?: (action: string, bookingId: string) => void
  onViewDetails?: (bookingId: string) => void
  onViewProgress?: (bookingId: string) => void
  onInvoiceAction?: (action: string, bookingId: string) => void
  density?: 'compact' | 'comfortable' | 'spacious'
  userRole?: 'client' | 'provider' | 'admin'
}

function formatDate(dateValue: any): string {
  if (!dateValue) return '—'
  
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '—'
  
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateTime(dateValue: any): string {
  if (!dateValue) return '—'
  
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '—'
  
  return date.toLocaleString('en-GB', { 
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function ImprovedBookingCard({ 
  booking, 
  invoice,
  isSelected, 
  onSelect, 
  onQuickAction,
  onViewDetails,
  onViewProgress,
  onInvoiceAction,
  density = 'comfortable',
  userRole = 'client'
}: ImprovedBookingCardProps) {
  const isCompact = density === 'compact'
  const isSpacious = density === 'spacious'
  
  // Extract booking data with fallbacks
  const serviceTitle = booking.service_title || booking.serviceTitle || booking.service_name || 'Professional Service'
  const clientName = booking.client_name || booking.clientName || 'Client'
  const providerName = booking.provider_name || booking.providerName || 'Provider'
  const status = booking.status || 'pending'
  const approvalStatus = booking.approval_status || booking.approvalStatus
  const progressPercentage = booking.progress_percentage || booking.progressPercentage || 0
  const amountCents = booking.amount_cents || (booking.amount ? booking.amount * 100 : 0)
  const currency = booking.currency || 'OMR'
  const createdAt = booking.created_at || booking.createdAt
  const updatedAt = booking.updated_at || booking.updatedAt || createdAt
  const category = booking.category || booking.service_category
  
  const paddingClass = isCompact ? 'p-3' : isSpacious ? 'p-6' : 'p-4'
  const spacingClass = isCompact ? 'space-y-2' : isSpacious ? 'space-y-4' : 'space-y-3'
  const textSizeClass = isCompact ? 'text-sm' : 'text-base'

  // Helper functions for action availability
  const isApproved = (booking.approval_status === 'approved') || (status === 'approved') || (status === 'confirmed')
  const isPendingApproval = (booking.approval_status === 'pending') || (status === 'pending')
  const hasInvoice = !!invoice
  const invoiceStatus = invoice?.status

  // Get available actions for three dots menu
  const getMoreActions = () => {
    const actions = []
    
    // Common actions
    actions.push({
      key: 'message',
      label: 'Send Message',
      icon: MessageSquare
    })
    
    actions.push({
      key: 'edit',
      label: 'Edit Booking',
      icon: Edit
    })
    
    // Role-specific actions
    if (userRole === 'admin' || userRole === 'provider') {
      if (!isApproved && isPendingApproval) {
        actions.push({
          key: 'approve',
          label: 'Approve Booking',
          icon: CheckCircle
        })
      }
      
      if (isApproved && !hasInvoice) {
        actions.push({
          key: 'create_invoice',
          label: 'Create Invoice',
          icon: FileText
        })
      }
      
      if (hasInvoice && invoiceStatus === 'draft') {
        actions.push({
          key: 'send_invoice',
          label: 'Send Invoice',
          icon: Send
        })
      }
      
      if (hasInvoice && invoiceStatus === 'issued') {
        actions.push({
          key: 'mark_paid',
          label: 'Mark as Paid',
          icon: CreditCard
        })
      }
    }
    
    if (userRole === 'client') {
      if (hasInvoice && invoiceStatus === 'issued') {
        actions.push({
          key: 'pay_invoice',
          label: 'Pay Invoice',
          icon: DollarSign
        })
      }
      
      if (hasInvoice) {
        actions.push({
          key: 'view_invoice',
          label: 'View Invoice',
          icon: FileText
        })
      }
    }
    
    // Status-based actions
    if (status === 'completed') {
      actions.push({
        key: 'download',
        label: 'Download Files',
        icon: Download
      })
    }
    
    return actions
  }

  return (
    <Card className="border rounded-xl hover:shadow-md transition-shadow duration-200">
      <CardContent className={paddingClass}>
        <div className={spacingClass}>
          {/* Header Section */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Selection Checkbox */}
              {onSelect && (
                <div className="pt-1">
                  <Checkbox
                    checked={!!isSelected}
                    onCheckedChange={onSelect}
                    aria-label="Select booking"
                  />
                </div>
              )}
              
              {/* Main Content */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Status and Last Updated */}
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge
                    status={status}
                    approval_status={approvalStatus}
                    progress_percentage={progressPercentage}
                    hasInvoice={!!invoice}
                    invoiceStatus={invoice?.status}
                  />
                  <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
                    Updated {formatDateTime(updatedAt)}
                  </Badge>
                </div>
                
                {/* Service Title */}
                <div className={`font-semibold text-gray-900 leading-tight ${textSizeClass}`}>
                  {isCompact ? (
                    <ServiceTitle title={serviceTitle} category={category} />
                  ) : (
                    serviceTitle
                  )}
                </div>
                
                {/* Client and Provider Info */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>{clientName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" />
                    <span>{providerName}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Primary Action Buttons */}
            <div className="flex items-center gap-1">
              {/* View Details Button */}
              {onViewDetails && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewDetails(booking.id)}
                  className="h-8 px-3 text-xs"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Details
                </Button>
              )}
              
              {/* Progress Button */}
              {onViewProgress && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewProgress(booking.id)}
                  className="h-8 px-3 text-xs"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  Progress
                </Button>
              )}
              
              {/* Invoice Button */}
              {onInvoiceAction && hasInvoice && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onInvoiceAction('view_invoice', booking.id)}
                  className="h-8 px-3 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Invoice
                </Button>
              )}
              
              {/* Three Dots Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {getMoreActions().map((action, index) => {
                    const Icon = action.icon
                    return (
                      <DropdownMenuItem
                        key={action.key}
                        onClick={() => {
                          if (action.key.includes('invoice')) {
                            onInvoiceAction?.(action.key, booking.id)
                          } else {
                            onQuickAction?.(action.key, booking.id)
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {action.label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Progress Section */}
          {!isCompact && (
            <ProgressIndicator
              status={status}
              approval_status={approvalStatus}
              progress_percentage={progressPercentage}
            />
          )}
          
          {isCompact && (
            <CompactProgressIndicator
              status={status}
              approval_status={approvalStatus}
              progress_percentage={progressPercentage}
            />
          )}

          {/* Details Grid */}
          <div className={`grid grid-cols-1 ${isCompact ? 'sm:grid-cols-2 gap-2 text-xs' : 'sm:grid-cols-3 gap-3 text-sm'}`}>
            {/* Created Date */}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{formatDate(createdAt)}</span>
            </div>
            
            {/* Amount */}
            <div className="flex items-center gap-2">
              {isCompact ? (
                <CompactAmountDisplay 
                  amount_cents={amountCents} 
                  currency={currency}
                />
              ) : (
                <AmountDisplay
                  amount_cents={amountCents}
                  currency={currency}
                  status={status}
                  invoice_status={invoice?.status}
                  compact={true}
                  showStatus={false}
                />
              )}
            </div>
            
            {/* Duration or Additional Info */}
            {!isCompact && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  {booking.estimated_duration || booking.duration?.estimated 
                    ? `${booking.estimated_duration || booking.duration.estimated} days`
                    : 'Duration TBD'
                  }
                </span>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  )
}

export default ImprovedBookingCard
