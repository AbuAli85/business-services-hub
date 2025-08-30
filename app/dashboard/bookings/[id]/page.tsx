'use client'

import BookingDetailsPage from '@/components/dashboard/booking-details-page'

interface BookingDetailsProps {
  params: {
    id: string
  }
}

export default function BookingDetails({ params }: BookingDetailsProps) {
  return <BookingDetailsPage />
}


