'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import EnhancedBookingDetails from '@/components/dashboard/enhanced-booking-details'
import { ProgressTabs } from '@/components/dashboard/progress-tabs'

type UserRole = 'provider' | 'client'

export default function BookingDetailsPage() {
  const params = useParams()
  const bookingId = params.id as string
  const [userRole, setUserRole] = useState<UserRole>('provider')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { getSupabaseClient } = await import('@/lib/supabase')
        const supabase = await getSupabaseClient()
        const { data: authData } = await supabase.auth.getUser()
        const userId = authData.user?.id
        if (!userId || !bookingId) return

        // Attempt to read booking party IDs; if not allowed (provider cannot select), default remains 'provider'
        const { data: booking, error } = await supabase
          .from('bookings')
          .select('client_id, provider_id')
          .eq('id', bookingId)
          .single()

        if (!error && booking) {
          if (booking.client_id === userId) {
            if (mounted) setUserRole('client')
            return
          }
          if (booking.provider_id === userId) {
            if (mounted) setUserRole('provider')
            return
          }
        }
      } catch {
        // Ignore and keep default
      }
    })()
    return () => { mounted = false }
  }, [bookingId])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Booking Details Section (includes requirements, actions, etc.) */}
        <EnhancedBookingDetails />

        {/* Progress & Timeline Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Progress & Timeline</h2>
          <ProgressTabs bookingId={bookingId} userRole={userRole} />
        </div>
      </div>
    </div>
  )
}