'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { BrandLoader } from '@/components/ui/BrandLoader'
import { toast } from 'sonner'

type UserRole = 'provider' | 'client' | 'admin'

export default function BookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string
  const [userRole, setUserRole] = useState<UserRole>('provider')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    const loadBookingData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const supabase = await getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          throw new Error('User not authenticated. Please sign in again.')
        }
        
        const userId = session.user.id

        // Load booking details with proper error handling
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            title,
            status,
            approval_status,
            created_at,
            scheduled_date,
            total_price,
            amount,
            currency,
            client_id,
            provider_id,
            service_id,
            services (
              id,
              title,
              description
            )
          `)
          .eq('id', bookingId)
          .single()

        if (bookingError) {
          throw new Error(`Failed to load booking: ${bookingError.message}`)
        }

        if (!mounted) return

        setBooking(bookingData)

        // Determine user role
        if (bookingData.client_id === userId) {
          setUserRole('client')
        } else if (bookingData.provider_id === userId) {
          setUserRole('provider')
        } else {
          // Check if user is admin
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_admin')
            .eq('id', userId)
            .single()
          
          if (profile?.is_admin || profile?.role === 'admin') {
            setUserRole('admin')
          } else {
            throw new Error('Access denied: You are not authorized to view this booking')
          }
        }

      } catch (err: any) {
        console.error('Error loading booking data:', err)
        if (mounted) {
          setError(err.message || 'Failed to load booking data')
          toast.error('Failed to load booking data')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    if (bookingId) {
      loadBookingData()
    }

    return () => { mounted = false }
  }, [bookingId])

  const handleBack = () => {
    router.push('/dashboard/bookings')
  }

  const handleRefresh = async () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <BrandLoader size={72} />
      </div>
    )
  }

  if (error) {
    const title = /denied|forbidden|unauthor/i.test(error)
      ? 'Access Denied'
      : /not found/i.test(error)
      ? 'Booking Not Found'
      : 'Error Loading Booking'
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <AlertTriangle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={handleBack} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
              <Button variant="outline" onClick={handleRefresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Booking Not Found</h3>
            <p className="text-gray-600 mb-4">The requested booking could not be found.</p>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {booking.title || 'Booking Details'}
            </h1>
            <p className="text-gray-600 mb-4">
              Booking ID: {booking.id}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Status: <span className="font-medium">{booking.status}</span>
              </span>
              <span className="text-sm text-gray-500">
                Role: <span className="font-medium capitalize">{userRole}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Booking content - simplified for now */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Booking Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-600">Service</span>
                  <p className="text-gray-900">
                    {booking.services?.title || 'Unknown Service'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Amount</span>
                  <p className="text-gray-900">
                    {booking.total_price || booking.amount || 0} {booking.currency || 'OMR'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Created</span>
                  <p className="text-gray-900">
                    {new Date(booking.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => router.push(`/dashboard/bookings/${bookingId}/milestones`)}
                >
                  View Milestones
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  Back to All Bookings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}