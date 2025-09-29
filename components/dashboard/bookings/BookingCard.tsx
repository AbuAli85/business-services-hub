'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Calendar, DollarSign, Clock, MoreHorizontal } from 'lucide-react'
import { QuickActions } from '@/components/dashboard/bookings/QuickActions'
import { muscatTz } from '@/lib/datetime'

export interface BookingCardProps {
  booking: any
  isSelected?: boolean
  onSelect?: (checked: boolean) => void
  onQuickAction?: (action: string, bookingId: string) => void
}

function getStatusBadge(status: string) {
  const normalized = (
    status === 'approved' || status === 'confirmed' ? 'confirmed' :
    status === 'in_production' || status === 'in_progress' ? 'in_progress' :
    status === 'delivered' || status === 'completed' ? 'completed' :
    status === 'canceled' ? 'cancelled' :
    status
  )

  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    confirmed: { label: 'Confirmed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    in_progress: { label: 'In Progress', className: 'bg-violet-50 text-violet-700 border-violet-200' },
    completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' },
    on_hold: { label: 'On Hold', className: 'bg-orange-50 text-orange-700 border-orange-200' }
  }
  const key = map[normalized] ? normalized : 'pending'
  return <Badge variant="outline" className={`text-xs font-semibold ${map[key].className}`}>{map[key].label}</Badge>
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
              <div className="flex items-center gap-2">
                {getStatusBadge(String(booking.status))}
                <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-200">
                  Updated {(() => {
                    const raw = booking.updatedAt || booking.updated_at || booking.createdAt || booking.created_at
                    const d = raw ? new Date(raw) : null
                    return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('en-GB', { timeZone: muscatTz }) : '—'
                  })()}
                </Badge>
              </div>
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
            <span>{(() => {
              const d = new Date(booking.createdAt || booking.created_at)
              return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { timeZone: muscatTz })
            })()}</span>
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

        <div className="mt-4">
          <QuickActions bookingId={String(booking.id)} onAction={(a)=> onQuickAction?.(a, String(booking.id))} />
        </div>
      </CardContent>
    </Card>
  )
}

export default BookingCard


