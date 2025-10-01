'use client'

import EnhancedBookingDetails from '@/components/dashboard/enhanced-booking-details'

export default function BookingDetailsPage() {
  return <EnhancedBookingDetails showProgressCard={true} userRole="provider" />
}