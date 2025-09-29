'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

export interface BookingDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: any | null
}

export function BookingDetailModal({ open, onOpenChange, booking }: BookingDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        {!booking ? (
          <div className="text-sm text-muted-foreground">No booking selected.</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Service</div>
              <div className="text-lg font-semibold">{booking.serviceTitle || booking.service_title}</div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Client</div>
                <div className="font-medium">{booking.clientName || booking.client_name}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Provider</div>
                <div className="font-medium">{booking.providerName || booking.provider_name}</div>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Created</div>
                <div className="font-medium">{new Date(booking.createdAt || booking.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Amount</div>
                <div className="font-medium">{booking.currency || 'OMR'} {Number(booking.totalAmount || booking.amount || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BookingDetailModal


