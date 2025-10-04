'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/StatusPill'
import { ProgressCell } from '@/components/ui/ProgressCell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  Calendar, 
  MessageSquare, 
  FileText, 
  User,
  Building,
  ExternalLink,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react'
import { formatMuscat } from '@/lib/dates'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BookingData {
  id: string
  booking_title?: string
  service_title: string
  service_description?: string
  service_category?: string
  client_name: string
  client_email?: string
  client_company?: string
  client_avatar?: string
  provider_name: string
  provider_email?: string
  provider_company?: string
  provider_avatar?: string
  progress: number
  total_milestones: number
  completed_milestones: number
  raw_status: string
  approval_status?: string
  display_status: string
  payment_status: string
  invoice_status?: string
  amount_cents?: number
  amount?: number
  currency: string
  created_at: string
  updated_at?: string
  due_at?: string
  requirements?: string
  notes?: string
}

interface EnhancedBookingTableProps {
  data: BookingData[]
  userRole?: string
  onViewDetails?: (bookingId: string) => void
  onViewMilestones?: (bookingId: string) => void
  onViewInvoice?: (bookingId: string) => void
  onMessageClient?: (clientId: string) => void
  onEditBooking?: (bookingId: string) => void
  onDeleteBooking?: (bookingId: string) => void
  className?: string
}

export function EnhancedBookingTable({ 
  data, 
  userRole = 'client',
  onViewDetails,
  onViewMilestones,
  onViewInvoice,
  onMessageClient,
  onEditBooking,
  onDeleteBooking,
  className 
}: EnhancedBookingTableProps) {
  
  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { 
          color: 'bg-green-100 text-green-800 border-green-200', 
          label: 'Paid', 
          icon: '✓',
          bgColor: 'bg-green-500'
        }
      case 'pending':
        return { 
          color: 'bg-amber-100 text-amber-800 border-amber-200', 
          label: 'Pending', 
          icon: '⏳',
          bgColor: 'bg-amber-500'
        }
      case 'invoiced':
        return { 
          color: 'bg-blue-100 text-blue-800 border-blue-200', 
          label: 'Invoiced', 
          icon: '📄',
          bgColor: 'bg-blue-500'
        }
      case 'no_invoice':
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          label: 'No Invoice', 
          icon: '—',
          bgColor: 'bg-gray-500'
        }
      default:
        return { 
          color: 'bg-gray-100 text-gray-800 border-gray-200', 
          label: 'Unknown', 
          icon: '?',
          bgColor: 'bg-gray-500'
        }
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'OMR') {
      return `${amount.toLocaleString('en-OM', { minimumFractionDigits: 2 })} ${currency}`
    }
    return formatCurrency(amount, currency)
  }

  const getServiceTitle = (booking: BookingData) => {
    if (booking.service_title && 
        booking.service_title !== 'Service' && 
        booking.service_title.trim() !== '' &&
        booking.service_title.length > 3) {
      return booking.service_title
    }
    
    if (booking.booking_title && 
        booking.booking_title !== 'Service' && 
        booking.booking_title.trim() !== '' &&
        booking.booking_title.length > 3) {
      return booking.booking_title
    }
    
    if (booking.service_category && booking.service_category !== '') {
      return `${booking.service_category} Service`
    }
    
    return `Business Service #${booking.id.slice(-6)}`
  }

  const getClientName = (booking: BookingData) => {
    if (booking.client_name && 
        booking.client_name !== 'Client' && 
        booking.client_name.trim() !== '' &&
        booking.client_name.length > 3) {
      return booking.client_name
    }
    
    if (booking.client_company && 
        booking.client_company.trim() !== '' &&
        booking.client_company.length > 3) {
      return booking.client_company
    }
    
    return `Individual Client #${booking.id.slice(-6)}`
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
        <p className="text-gray-600">Get started by creating your first booking.</p>
      </div>
    )
  }

  return (
    <div className={cn('overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      <table className="min-w-full text-sm text-gray-700">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
          <tr>
            <th className="px-4 py-3 text-left">Service</th>
            <th className="px-4 py-3 text-left">Client</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Progress</th>
            <th className="px-4 py-3 text-left">Payment</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-left">Created</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {data.map((booking) => {
            const serviceTitle = getServiceTitle(booking)
            const clientName = getClientName(booking)
            const paymentConfig = getPaymentStatusConfig(booking.payment_status)
            const amount = booking.amount_cents ? booking.amount_cents / 100 : booking.amount || 0

            return (
              <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-150">
                {/* Service Column */}
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/dashboard/services/${booking.id}`}
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
                </td>

                {/* Client Column */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={booking.client_avatar} alt={clientName} />
                      <AvatarFallback className="text-xs">
                        {clientName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate" title={clientName}>
                        {clientName}
                      </div>
                      {booking.client_company && booking.client_company !== clientName && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          <span className="truncate" title={booking.client_company}>
                            {booking.client_company}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status Column */}
                <td className="px-4 py-3">
                  <StatusPill status={booking.display_status} size="sm" />
                </td>

                {/* Progress Column */}
                <td className="px-4 py-3">
                  <ProgressCell 
                    progress={booking.progress}
                    totalMilestones={booking.total_milestones}
                    completedMilestones={booking.completed_milestones}
                    size="sm"
                    showMilestones={true}
                  />
                </td>

                {/* Payment Column */}
                <td className="px-4 py-3">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border shadow-sm ${paymentConfig.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${paymentConfig.bgColor}`}></div>
                    <span>{paymentConfig.label}</span>
                  </div>
                </td>

                {/* Amount Column */}
                <td className="px-4 py-3 text-right">
                  <div className="font-semibold text-gray-900">
                    {formatAmount(amount, booking.currency)}
                  </div>
                </td>

                {/* Created Column */}
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-500">
                    {formatMuscat(booking.created_at)}
                  </div>
                </td>

                {/* Actions Column */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails?.(booking.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewMilestones?.(booking.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    
                    {booking.invoice_status && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewInvoice?.(booking.id)}
                        className="h-8 w-8 p-0"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMessageClient?.(booking.client_name)}
                      className="h-8 w-8 p-0"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
