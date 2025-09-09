'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Download, Share2, Settings, User, Shield, Eye } from 'lucide-react'
import { ProfessionalMilestoneSystem } from '@/components/dashboard/professional-milestone-system'
import { ProfessionalMilestoneManager } from '@/components/dashboard/professional-milestone-manager'
import { ClientMilestoneViewer } from '@/components/dashboard/client-milestone-viewer'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

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
  scheduled_date: string
  total_price: number
  currency: string
}

type UserRole = 'client' | 'provider' | 'admin'

export default function MilestonesPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<Booking | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('client')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        throw new Error(`Failed to load booking: ${bookingError.message}`)
      }

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

      // Determine user role
      if (bookingData.client_id === user.id) {
        setUserRole('client')
      } else if (bookingData.provider_id === user.id) {
        setUserRole('provider')
      } else {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile?.role === 'admin') {
          setUserRole('admin')
        } else {
          throw new Error('Access denied: You are not authorized to view this booking')
        }
      }

    } catch (err) {
      console.error('Error loading booking data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load booking data')
      toast.error('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadBookingData()
  }

  const handleBack = () => {
    router.push('/dashboard/bookings')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <Shield className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {booking.title}
                </h1>
                <p className="text-sm text-gray-600">
                  {booking.service.name} • {booking.client.full_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <Badge 
                className={
                  userRole === 'provider' ? 'bg-blue-100 text-blue-800' :
                  userRole === 'client' ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }
              >
                {userRole === 'provider' ? (
                  <>
                    <Settings className="h-3 w-3 mr-1" />
                    Provider
                  </>
                ) : userRole === 'client' ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Client
                  </>
                ) : (
                  <>
                    <Shield className="h-3 w-3 mr-1" />
                    Admin
                  </>
                )}
              </Badge>
              
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
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Info Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Project Details</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Service:</span> {booking.service.name}
                  </p>
                  <div className="text-sm text-gray-900">
                    <span className="font-medium">Status:</span> 
                    <Badge className="ml-2 bg-blue-100 text-blue-800">
                      {booking.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Created:</span> {new Date(booking.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Client Information</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Name:</span> {booking.client.full_name}
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Email:</span> {booking.client.email}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Provider Information</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Name:</span> {booking.provider.full_name}
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Email:</span> {booking.provider.email}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Milestone System */}
        {userRole === 'provider' ? (
          <ProfessionalMilestoneSystem
            bookingId={bookingId}
          />
        ) : (
          <ClientMilestoneViewer
            bookingId={bookingId}
          />
        )}
      </div>
    </div>
  )
}