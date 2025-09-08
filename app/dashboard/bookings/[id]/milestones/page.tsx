'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Download, Share2 } from 'lucide-react'
import { MilestoneDashboardIntegration } from '@/components/dashboard/milestone-dashboard-integration'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Booking {
  id: string
  title: string
  status: string
  service: {
    name: string
    description?: string
  }
  client: {
    full_name: string
    email: string
  }
  provider: {
    full_name: string
    email: string
  }
  created_at: string
  scheduled_date?: string
  total_price?: number
  currency?: string
}

export default function BookingMilestonesPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string
  
  const [booking, setBooking] = useState<Booking | null>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin'>('client')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadBookingData = async () => {
      try {
        setLoading(true)
        setError(null)

        const supabase = await getSupabaseClient()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('User not authenticated')
        }

        // Load booking details
        const { data: bookingData, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            id,
            title,
            status,
            created_at,
            scheduled_date,
            total_price,
            currency,
            client_id,
            provider_id,
            service_id,
            services (
              id,
              title,
              description
            ),
            client:profiles!bookings_client_id_fkey (
              id,
              full_name,
              email
            ),
            provider:profiles!bookings_provider_id_fkey (
              id,
              full_name,
              email
            )
          `)
          .eq('id', bookingId)
          .single()

        if (bookingError) {
          throw new Error('Booking not found')
        }

        // Determine user role
        let role: 'client' | 'provider' | 'admin' = 'client'
        if (bookingData.client_id === user.id) {
          role = 'client'
        } else if (bookingData.provider_id === user.id) {
          role = 'provider'
        } else {
          // Check if user is admin (you might have an admin check here)
          role = 'admin'
        }

        setUserRole(role)

        // Transform booking data
        const transformedBooking: Booking = {
          id: bookingData.id,
          title: bookingData.title,
          status: bookingData.status,
          service: {
            name: (bookingData.services as any)?.title || 'Unknown Service',
            description: (bookingData.services as any)?.description
          },
          client: {
            full_name: (bookingData.client as any)?.full_name || 'Unknown Client',
            email: (bookingData.client as any)?.email || ''
          },
          provider: {
            full_name: (bookingData.provider as any)?.full_name || 'Unknown Provider',
            email: (bookingData.provider as any)?.email || ''
          },
          created_at: bookingData.created_at,
          scheduled_date: bookingData.scheduled_date,
          total_price: bookingData.total_price,
          currency: bookingData.currency || 'OMR'
        }

        setBooking(transformedBooking)

      } catch (err) {
        console.error('Error loading booking:', err)
        setError(err instanceof Error ? err.message : 'Failed to load booking')
        toast.error('Failed to load booking details')
      } finally {
        setLoading(false)
      }
    }

    if (bookingId) {
      loadBookingData()
    }
  }, [bookingId])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleExport = () => {
    // Implement export functionality
    toast.success('Export feature coming soon!')
  }

  const handleShare = () => {
    // Implement share functionality
    navigator.clipboard.writeText(window.location.href)
    toast.success('Link copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project milestones...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Project</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Not Found</h3>
          <p className="text-gray-600 mb-4">The requested booking could not be found.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {booking.title}
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span>Service: {booking.service.name}</span>
                  <Badge variant="outline">{booking.status}</Badge>
                  <span>Role: {userRole}</span>
                  {booking.total_price && (
                    <span>Price: {booking.total_price} {booking.currency}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Client Information</h4>
              <p className="text-gray-600">{booking.client.full_name}</p>
              <p className="text-gray-600">{booking.client.email}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Provider Information</h4>
              <p className="text-gray-600">{booking.provider.full_name}</p>
              <p className="text-gray-600">{booking.provider.email}</p>
            </div>
          </div>
          {booking.service.description && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Service Description</h4>
              <p className="text-gray-600">{booking.service.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Milestone Dashboard */}
      <MilestoneDashboardIntegration
        bookingId={bookingId}
        userRole={userRole}
        className="w-full"
      />
    </div>
  )
}
