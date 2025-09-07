'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import EnhancedBookingDetails from '@/components/dashboard/enhanced-booking-details'
import { ProgressTabs } from '@/components/dashboard/progress-tabs'

export default function BookingDetailsPage() {
  const params = useParams()
  const bookingId = params.id as string

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Booking Details Section (includes requirements, actions, etc.) */}
        <EnhancedBookingDetails />

        {/* Progress & Timeline Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Progress & Timeline</h2>
          <ProgressTabs bookingId={bookingId} userRole={'provider'} />
        </div>
      </div>
    </div>
  )
}