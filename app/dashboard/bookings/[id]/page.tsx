'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, Users, Calendar, Clock, Banknote } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { BrandLoader } from '@/components/ui/BrandLoader'
import { toast } from 'sonner'

export default function BookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState<any>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin'>('provider')

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

        // Load booking details with enhanced data
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            services (
              id,
              title,
              description,
              category,
              base_price,
              currency,
              estimated_duration
            ),
            client_profile:profiles!bookings_client_id_fkey (
              id,
              full_name,
              email,
              phone,
              company_name,
              avatar_url
            ),
            provider_profile:profiles!bookings_provider_id_fkey (
              id,
              full_name,
              email,
              phone,
              company_name,
              avatar_url
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

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      declined: 'bg-red-100 text-red-800 border-red-300',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-300',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      on_hold: 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <BrandLoader size={72} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Error Loading Booking</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Button>
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
        {/* Header */}
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {booking.title || 'Booking Details'}
                </h1>
                <p className="text-gray-600 mb-2">
                  Booking ID: {booking.id}
                </p>
                <div className="flex items-center gap-4">
                  <Badge className={`px-3 py-1 ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Role: <span className="font-medium capitalize">{userRole}</span>
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {booking.amount || booking.total_price || 0} {booking.currency || 'OMR'}
                </div>
                <div className="text-sm text-gray-500">Total Amount</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <span>Service Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  {booking.services?.title || 'Service'}
                </h4>
                <p className="text-gray-600 text-sm mb-2">
                  {booking.services?.description || 'No description available'}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {booking.services?.category || 'General'}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">
                    {booking.amount || booking.total_price || 0} {booking.currency || 'OMR'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
                    {booking.services?.estimated_duration || 'TBD'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Contact Info</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client Info */}
              <div>
                <h4 className="font-medium text-gray-900">Client</h4>
                <p className="text-sm text-gray-600">
                  {booking.client_profile?.full_name || 'Unknown Client'}
                </p>
                <p className="text-xs text-gray-500">
                  {booking.client_profile?.email || 'No email'}
                </p>
              </div>

              {/* Provider Info */}
              <div>
                <h4 className="font-medium text-gray-900">Provider</h4>
                <p className="text-sm text-gray-600">
                  {booking.provider_profile?.full_name || 'Unknown Provider'}
                </p>
                <p className="text-xs text-gray-500">
                  {booking.provider_profile?.email || 'No email'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        </div>

        {/* Additional Details */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Created</p>
                    <p className="text-sm text-gray-900">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Scheduled</p>
                    <p className="text-sm text-gray-900">
                      {booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Banknote className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Payment Status</p>
                    <p className="text-sm text-gray-900">
                      {booking.payment_status || 'Pending'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Progress</p>
                    <p className="text-sm text-gray-900">
                      {booking.progress_percentage || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}