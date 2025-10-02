'use client'

import { Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BookingDetailsSkeleton } from '@/components/dashboard/bookings/BookingDetailsSkeleton'
import { BookingDetailsError } from '@/components/dashboard/bookings/BookingDetailsError'
import { BookingDetailsMain } from '@/components/dashboard/bookings/BookingDetailsMain'

function BookingDetailsContent() {
  const { user, userRole, loading: userLoading, error: authError } = useAuth()

  if (userLoading) {
    return <BookingDetailsSkeleton />
  }

  if (authError || !user || !userRole) {
    const msg = authError || 'You are not authenticated. Please sign in again.'
    return <BookingDetailsError error={msg} />
  }

  return <BookingDetailsMain userRole={userRole} />
}

export default function BookingDetailsPage() {
  return (
    <Suspense fallback={<BookingDetailsSkeleton />}>
      <BookingDetailsContent />
    </Suspense>
  )
}