'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Eye, 
  MoreVertical, 
  BarChart3, 
  FileText, 
  DollarSign,
  MessageSquare,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  User,
  Building2,
  CreditCard,
  Send,
  Download,
  Star,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ProfessionalBookingListProps {
  bookings: any[]
  invoices?: Map<string, any>
  userRole?: 'client' | 'provider' | 'admin'
  onViewDetails?: (bookingId: string) => void
  onViewProgress?: (bookingId: string) => void
  onInvoiceAction?: (action: string, bookingId: string) => void
  onQuickAction?: (action: string, bookingId: string) => void
  selectedIds?: Set<string>
  onSelect?: (bookingId: string, checked: boolean) => void
  onSelectAll?: (checked: boolean) => void
  loading?: boolean
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

function formatAmount(amountCents: number, currency: string = 'OMR'): string {
  const amount = amountCents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'OMR' ? 'USD' : currency,
    minimumFractionDigits: 2,
  }).format(amount).replace('$', currency === 'OMR' ? 'OMR ' : '$')
}

function getStatusColor(status: string, approvalStatus?: string): string {
  const combinedStatus = approvalStatus || status
  
  switch (combinedStatus) {
    case 'approved':
    case 'confirmed':
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'pending':
    case 'draft':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'in_progress':
    case 'active':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'cancelled':
    case 'declined':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'on_hold':
    case 'paused':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 60) return 'bg-blue-500'
  if (percentage >= 40) return 'bg-yellow-500'
  if (percentage >= 20) return 'bg-orange-500'
  return 'bg-red-500'
}

function getPaymentStatusColor(status?: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'pending':
    case 'issued':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function ProfessionalBookingList({
  bookings,
  invoices = new Map(),
  userRole = 'client',
  onViewDetails,
  onViewProgress,
  onInvoiceAction,
  onQuickAction,
  selectedIds = new Set(),
  onSelect,
  onSelectAll,
  loading = false
}: ProfessionalBookingListProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Get column configuration based on user role
  const getColumns = () => {
    const baseColumns = [
      { key: 'service', label: 'Service', width: 'w-64' },
      { key: 'client', label: 'Client', width: 'w-48' },
      { key: 'provider', label: 'Provider', width: 'w-48' },
      { key: 'status', label: 'Status', width: 'w-32' },
      { key: 'progress', label: 'Progress', width: 'w-40' },
      { key: 'payment', label: 'Payment', width: 'w-32' },
      { key: 'amount', label: 'Amount', width: 'w-32' },
      { key: 'created', label: 'Created', width: 'w-32' },
      { key: 'actions', label: 'Actions', width: 'w-24' }
    ]

    // Role-specific column adjustments
    if (userRole === 'client') {
      return baseColumns.filter(col => col.key !== 'client') // Remove client column for clients
    } else if (userRole === 'provider') {
      return baseColumns.filter(col => col.key !== 'provider') // Remove provider column for providers
    }
    
    return baseColumns
  }

  const columns = getColumns()

  const getAvailableActions = (booking: any, invoice?: any) => {
    const actions = []
    const status = booking.status || 'pending'
    const approvalStatus = booking.approval_status
    const isApproved = (approvalStatus === 'approved') || (status === 'approved') || (status === 'confirmed')
    const hasInvoice = !!invoice

    // Common actions
    actions.push({
      key: 'view_details',
      label: 'View Details',
      icon: Eye,
      variant: 'default' as const
    })

    actions.push({
      key: 'view_progress',
      label: 'View Progress',
      icon: BarChart3,
      variant: 'default' as const
    })

    // Role-specific actions
    if (userRole === 'admin' || userRole === 'provider') {
      if (!isApproved && (approvalStatus === 'pending' || status === 'pending')) {
        actions.push({
          key: 'approve',
          label: 'Approve Booking',
          icon: CheckCircle,
          variant: 'default' as const
        })
      }

      if (isApproved && !hasInvoice) {
        actions.push({
          key: 'create_invoice',
          label: 'Create Invoice',
          icon: FileText,
          variant: 'default' as const
        })
      }

      if (hasInvoice && invoice?.status === 'draft') {
        actions.push({
          key: 'send_invoice',
          label: 'Send Invoice',
          icon: Send,
          variant: 'default' as const
        })
      }

      if (hasInvoice && invoice?.status === 'issued') {
        actions.push({
          key: 'mark_paid',
          label: 'Mark as Paid',
          icon: CreditCard,
          variant: 'default' as const
        })
      }
    }

    if (userRole === 'client') {
      if (hasInvoice && invoice?.status === 'issued') {
        actions.push({
          key: 'pay_invoice',
          label: 'Pay Invoice',
          icon: DollarSign,
          variant: 'default' as const
        })
      }

      if (hasInvoice) {
        actions.push({
          key: 'view_invoice',
          label: 'View Invoice',
          icon: FileText,
          variant: 'default' as const
        })
      }
    }

    // Additional actions
    actions.push({
      key: 'message',
      label: 'Send Message',
      icon: MessageSquare,
      variant: 'outline' as const
    })

    actions.push({
      key: 'edit',
      label: 'Edit Booking',
      icon: Edit,
      variant: 'outline' as const
    })

    if (status === 'completed') {
      actions.push({
        key: 'download',
        label: 'Download Files',
        icon: Download,
        variant: 'outline' as const
      })
    }

    return actions
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Professional Bookings Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full shadow-lg border-0 bg-white">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          Professional Bookings Overview
          <Badge variant="secondary" className="ml-auto">
            {bookings.length} Total
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 border-b">
                {onSelect && onSelectAll && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === bookings.length && bookings.length > 0}
                      onCheckedChange={onSelectAll}
                    />
                  </TableHead>
                )}
                {columns.map((column) => (
                  <TableHead 
                    key={column.key} 
                    className={cn(
                      "font-semibold text-gray-700 py-4",
                      column.width
                    )}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {bookings.map((booking) => {
                const invoice = invoices.get(String(booking.id))
                const progressPercentage = booking.progress_percentage || 0
                const actions = getAvailableActions(booking, invoice)
                
                return (
                  <TableRow
                    key={booking.id}
                    className={cn(
                      "hover:bg-blue-50/30 transition-colors border-b border-gray-100",
                      hoveredRow === booking.id && "bg-blue-50/50"
                    )}
                    onMouseEnter={() => setHoveredRow(booking.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {onSelect && (
                      <TableCell className="py-4">
                        <Checkbox
                          checked={selectedIds.has(booking.id)}
                          onCheckedChange={(checked) => onSelect(booking.id, !!checked)}
                        />
                      </TableCell>
                    )}
                    
                    {/* Service Column */}
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Zap className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.service_title || booking.serviceTitle || booking.service_name || 'Professional Service'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.service_category || booking.category || booking.service_type || 'Business Service'}
                          </div>
                          {booking.service_description && (
                            <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                              {booking.service_description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Client Column (hidden for clients) */}
                    {userRole !== 'client' && (
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={booking.client_logo_url || booking.client_avatar} />
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {getInitials(booking.client_name || booking.client_full_name || 'Client')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">
                              {booking.client_name || booking.client_full_name || booking.client_display_name || 'Client'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {booking.client_company || booking.client_company_name || booking.client_organization || 'Individual'}
                            </div>
                            {booking.client_email && (
                              <div className="text-xs text-gray-400">
                                {booking.client_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    
                    {/* Provider Column (hidden for providers) */}
                    {userRole !== 'provider' && (
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={booking.provider_logo_url || booking.provider_avatar} />
                            <AvatarFallback className="bg-green-100 text-green-600 text-xs">
                              {getInitials(booking.provider_name || booking.provider_full_name || 'Provider')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">
                              {booking.provider_name || booking.provider_full_name || booking.provider_display_name || 'Provider'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {booking.provider_company || booking.provider_company_name || booking.provider_organization || 'Professional'}
                            </div>
                            {booking.provider_email && (
                              <div className="text-xs text-gray-400">
                                {booking.provider_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    
                    {/* Status Column */}
                    <TableCell className="py-4">
                      <Badge 
                        className={cn(
                          "font-medium border",
                          getStatusColor(booking.status, booking.approval_status)
                        )}
                      >
                        {booking.approval_status || booking.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    
                    {/* Progress Column */}
                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 font-medium">{progressPercentage}%</span>
                          <span className="text-gray-500">
                            {booking.completed_milestones || booking.completed_tasks || 0}/{booking.total_milestones || booking.total_tasks || 0}
                          </span>
                        </div>
                        <Progress 
                          value={progressPercentage} 
                          className="h-2"
                        />
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          {progressPercentage >= 80 ? (
                            <Star className="h-3 w-3 text-green-500" />
                          ) : progressPercentage >= 50 ? (
                            <TrendingUp className="h-3 w-3 text-blue-500" />
                          ) : progressPercentage > 0 ? (
                            <Clock className="h-3 w-3 text-yellow-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-gray-400" />
                          )}
                          <span>
                            {progressPercentage >= 80 ? 'On Track' : 
                             progressPercentage >= 50 ? 'In Progress' : 
                             progressPercentage > 0 ? 'Getting Started' : 'Not Started'}
                          </span>
                        </div>
                        {booking.next_milestone && (
                          <div className="text-xs text-gray-400 truncate">
                            Next: {booking.next_milestone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Payment Column */}
                    <TableCell className="py-4">
                      {invoice ? (
                        <Badge 
                          className={cn(
                            "font-medium border",
                            getPaymentStatusColor(invoice.status)
                          )}
                        >
                          {invoice.status === 'paid' ? 'Paid' :
                           invoice.status === 'issued' ? 'Pending' :
                           invoice.status === 'overdue' ? 'Overdue' :
                           invoice.status === 'draft' ? 'Draft' : 'Unknown'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500 border-gray-300">
                          No Invoice
                        </Badge>
                      )}
                    </TableCell>
                    
                    {/* Amount Column */}
                    <TableCell className="py-4">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatAmount(booking.amount_cents || 0, booking.currency)}
                        </div>
                        {booking.currency !== 'OMR' && (
                          <div className="text-xs text-gray-500">
                            {booking.currency}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Created Column */}
                    <TableCell className="py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {formatDate(booking.created_at)}
                        </div>
                        <div className="text-gray-500">
                          {formatDateTime(booking.updated_at || booking.created_at)}
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Actions Column */}
                    <TableCell className="py-4">
                      <div className="flex items-center justify-center">
                        {/* Three Dots Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {actions.map((action, index) => {
                              const Icon = action.icon
                              return (
                                <DropdownMenuItem
                                  key={action.key}
                                  onClick={() => {
                                    if (action.key.includes('invoice')) {
                                      onInvoiceAction?.(action.key, booking.id)
                                    } else if (action.key === 'view_details') {
                                      onViewDetails?.(booking.id)
                                    } else if (action.key === 'view_progress') {
                                      onViewProgress?.(booking.id)
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        
        {bookings.length === 0 && (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
            <p className="text-gray-500">Get started by creating your first booking.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProfessionalBookingList
