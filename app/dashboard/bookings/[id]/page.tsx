'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { EnhancedRealtimeProgress } from '@/components/dashboard/enhanced-realtime-progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Clock, 
  Target,
  AlertCircle
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { format, isValid, parseISO } from 'date-fns'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Booking {
  id: string
  title: string
  description: string
  status: string
  approval_status?: string
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  scheduled_start?: string
  scheduled_end?: string
  total_amount?: number
  amount?: number
  total_price?: number
  currency: string
  client_id: string
  provider_id: string
  service_id: string
  created_at: string
  updated_at: string
  client: {
    id: string
    full_name: string
    email: string
  }
  provider: {
    id: string
    full_name: string
    email: string
  }
  service: {
    id: string
    title: string
    description: string
  }
}

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Not set'
  
  try {
    const date = parseISO(dateString)
    if (isValid(date)) {
      return format(date, 'MMM dd, yyyy')
    }
    return 'Invalid date'
  } catch (error) {
    console.warn('Date formatting error:', error)
    return 'Invalid date'
  }
}

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined, currency: string = 'OMR'): string => {
  if (amount === null || amount === undefined || amount === 0) {
    return `0 ${currency}`
  }
  
  return `${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} ${currency}`
}

export default function BookingDetails() {
  const params = useParams()
  const bookingId = params.id as string
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'provider' | 'client'>('client')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadBookingData()
  }, [bookingId])

  const loadBookingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Authentication required')
      }

      // Load booking with related data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(id, full_name, email),
          provider:profiles!bookings_provider_id_fkey(id, full_name, email),
          service:services!bookings_service_id_fkey(id, title, description)
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError) {
        throw bookingError
      }

      if (!bookingData) {
        throw new Error('Booking not found')
      }

      setBooking(bookingData)

      // Determine user role
      if (bookingData.provider_id === user.id) {
        setUserRole('provider')
      } else if (bookingData.client_id === user.id) {
        setUserRole('client')
      } else {
        throw new Error('Access denied')
      }

    } catch (err) {
      console.error('Error loading booking:', err)
      setError(err instanceof Error ? err.message : 'Failed to load booking')
      toast.error('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = async (action: 'approve' | 'decline') => {
    if (!booking) return

    try {
      setIsUpdating(true)
      
      // Show confirmation dialog for decline
      let reason = ''
      if (action === 'decline') {
        reason = prompt('Please provide a reason for declining this booking (optional):') || ''
      }

      // Get authenticated Supabase client
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('No active session. Please sign in again.')
      }

      // Make authenticated request with proper headers
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          booking_id: booking.id,
          action: action,
          reason: reason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`API Error (${response.status}):`, errorData)
        throw new Error(errorData.error || `Failed to ${action} booking (${response.status})`)
      }

      const result = await response.json()
      console.log(`Booking ${action} result:`, result)
      
      // Update local state
      setBooking({ 
        ...booking, 
        status: action === 'approve' ? 'approved' : 'declined',
        approval_status: action === 'approve' ? 'approved' : 'rejected'
      })

      toast.success(`Booking ${action === 'approve' ? 'approved' : 'declined'} successfully`)
      
      // Refresh booking data
      await loadBookingData()
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error)
      toast.error(`Failed to ${action} booking: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Booking</h2>
            <p className="text-gray-600 mb-6">{error || 'Booking not found'}</p>
            <Link href="/dashboard/bookings">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Bookings
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard/bookings">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Bookings
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{booking.title}</h1>
                <p className="text-gray-600">{booking.service.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge 
                variant={booking.status === 'completed' ? 'default' : 
                        booking.status === 'approved' ? 'secondary' :
                        booking.status === 'in_progress' ? 'secondary' : 
                        booking.status === 'declined' ? 'destructive' : 'outline'}
                className="text-sm"
              >
                {booking.status.replace('_', ' ')}
              </Badge>
              
              {/* Approval Actions for Providers */}
              {userRole === 'provider' && booking.status === 'pending' && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleApprovalAction('approve')}
                    disabled={isUpdating}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    {isUpdating ? 'Processing...' : 'Approve'}
                  </Button>
                  <Button
                    onClick={() => handleApprovalAction('decline')}
                    disabled={isUpdating}
                    variant="destructive"
                    size="sm"
                  >
                    {isUpdating ? 'Processing...' : 'Decline'}
                  </Button>
                </div>
              )}
              
              {/* Status message for clients */}
              {userRole === 'client' && booking.status === 'pending' && (
                <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                  ⏳ Awaiting provider approval
                </div>
              )}
              
              {userRole === 'client' && booking.status === 'approved' && (
                <div className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  ✅ Approved - Ready to start
                </div>
              )}
              
              {userRole === 'client' && booking.status === 'declined' && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                  ❌ Declined by provider
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Start Date</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(booking.start_time || booking.scheduled_start)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">End Date</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(booking.end_time || booking.scheduled_end)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {userRole === 'provider' ? 'Client' : 'Provider'}
                  </p>
                  <p className="text-sm text-gray-900">
                    {userRole === 'provider' ? booking.client.full_name : booking.provider.full_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-sm text-gray-900">
                    {formatCurrency(booking.total_amount || booking.amount || booking.total_price, booking.currency)}
                  </p>
                </div>
              </div>
            </div>

            {booking.description && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Description</h3>
                <p className="text-sm text-gray-900">{booking.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Tracking System - Only show if approved */}
        {booking.status === 'approved' || booking.status === 'in_progress' || booking.status === 'completed' ? (
          <EnhancedRealtimeProgress
            bookingId={bookingId}
            userRole={userRole}
          />
        ) : (
          <Card className="mb-6">
            <CardContent className="p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {booking.status === 'pending' ? 'Awaiting Approval' : 'Booking Not Approved'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {booking.status === 'pending' 
                    ? 'This booking is pending provider approval. Progress tracking will be available once approved.'
                    : 'This booking has been declined or is not approved. Progress tracking is not available.'
                  }
                </p>
                {userRole === 'provider' && booking.status === 'pending' && (
                  <div className="flex items-center justify-center space-x-3">
                    <Button
                      onClick={() => handleApprovalAction('approve')}
                      disabled={isUpdating}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isUpdating ? 'Processing...' : 'Approve Booking'}
                    </Button>
                    <Button
                      onClick={() => handleApprovalAction('decline')}
                      disabled={isUpdating}
                      variant="outline"
                    >
                      {isUpdating ? 'Processing...' : 'Decline'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


