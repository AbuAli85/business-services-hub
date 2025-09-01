'use client'

import EnhancedBookingDetails from '@/components/dashboard/enhanced-booking-details'

interface BookingDetailsProps {
  params: {
    id: string
  }
}

export default function BookingDetails({ params }: BookingDetailsProps) {
  return <EnhancedBookingDetails />
}


