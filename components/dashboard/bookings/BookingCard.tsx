'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Calendar, DollarSign, Clock, MoreHorizontal } from 'lucide-react'

export interface BookingCardProps {
  booking: any
  isSelected?: boolean
  onSelect?: (checked: boolean) => void
  onQuickAction?: (action: string, bookingId: string) => void
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    approved: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    in_production: { label: 'In Progress', className: 'bg-purple-100 text-purple-700 border-purple-200' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
    delivered: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200' },
    cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-700 border-gray-200' }
  }
  const key = map[status] ? status : 'pending'
  return <Badge variant="outline" className={map[key].className}>{map[key].label}</Badge>
}

export function BookingCard({ booking, isSelected, onSelect, onQuickAction }: BookingCardProps) {
  const progressPct = Math.max(0, Math.min(100, Number(booking?.progress?.percentage ?? booking?.progress_percentage ?? 0)))

  return (
    <Card className="border rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {typeof onSelect === 'function' && (
              <input
                aria-label="Select booking"
                type="checkbox"
                checked={!!isSelected}
                onChange={(e) => onSelect(e.target.checked)}
                className="h-4 w-4"
              />
            )}
            <div className="space-y-1">
              {getStatusBadge(String(booking.status))}
              <div className="text-lg font-semibold leading-tight">
                {booking.serviceTitle || booking.service_name || 'Service'}
              </div>
              <div className="text-sm text-muted-foreground">
                {(booking.providerName || booking.provider_name || 'Provider')} • {(booking.clientName || booking.client_name || 'Client')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="More actions" onClick={() => onQuickAction?.('menu', booking.id)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progressPct}% Complete</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(booking.createdAt || booking.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>{booking.currency || 'OMR'} {Number(booking.totalAmount || booking.amount || 0).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{booking.duration?.estimated ? `${booking.duration.estimated} days` : '—'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BookingCard


