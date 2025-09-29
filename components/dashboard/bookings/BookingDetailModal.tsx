'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
          <DialogTitle>{booking?.serviceTitle || booking?.service_title || 'Booking Details'}</DialogTitle>
        </DialogHeader>
        {!booking ? (
          <div className="text-sm text-muted-foreground">No booking selected.</div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
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
            </TabsContent>
            <TabsContent value="milestones" className="text-sm text-muted-foreground">
              Milestone tracking coming soon.
            </TabsContent>
            <TabsContent value="communications" className="text-sm text-muted-foreground">
              Communications thread coming soon.
            </TabsContent>
            <TabsContent value="files" className="text-sm text-muted-foreground">
              File management coming soon.
            </TabsContent>
            <TabsContent value="payments" className="text-sm text-muted-foreground">
              Payment history coming soon.
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BookingDetailModal


