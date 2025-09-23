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

      // Load booking details with separate profile queries for reliability
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          title,
          status,
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

      // Load enriched booking data via dedicated API
      let clientProfile = null
      let providerProfile = null

      try {
        // Use the dedicated booking details API
        const enrichedResponse = await fetch(`/api/bookings/${bookingId}`, {
          headers: { 'Content-Type': 'application/json' }
        })
        
        if (enrichedResponse.ok) {
          const enrichedData = await enrichedResponse.json()
          const enrichedBooking = enrichedData.booking
          
          if (enrichedBooking) {
            clientProfile = enrichedBooking.client_profile
            providerProfile = enrichedBooking.provider_profile
            
            // Update the booking data with enriched service info if available
            if (enrichedBooking.services) {
              bookingData.services = enrichedBooking.services
            }
            
            console.log('Profiles loaded via dedicated API:', {
              client: clientProfile?.full_name,
              provider: providerProfile?.full_name
            })
          }
        } else {
          console.warn('Failed to load enriched booking data:', enrichedResponse.status)
        }
      } catch (apiError) {
        console.warn('Failed to load enriched booking data via API:', apiError)
      }

      // Fallback: try direct profile queries if API failed
      if (!clientProfile && bookingData.client_id) {
        console.log('Fallback: Loading client profile for ID:', bookingData.client_id)
        try {
          const { data: clientData, error: clientError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', bookingData.client_id)
            .maybeSingle()
          
          if (!clientError && clientData) {
            clientProfile = clientData
            console.log('Client profile loaded via fallback:', clientData.full_name)
          } else {
            console.warn('Failed to load client profile:', clientError)
          }
        } catch (err) {
          console.error('Error loading client profile:', err)
        }
      }

      if (!providerProfile && bookingData.provider_id) {
        console.log('Fallback: Loading provider profile for ID:', bookingData.provider_id)
        try {
          const { data: providerData, error: providerError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', bookingData.provider_id)
            .maybeSingle()
          
          if (!providerError && providerData) {
            providerProfile = providerData
            console.log('Provider profile loaded via fallback:', providerData.full_name)
          } else {
            console.warn('Failed to load provider profile:', providerError)
          }
        } catch (err) {
          console.error('Error loading provider profile:', err)
        }
      }

      // Transform booking data with properly loaded profiles
      const transformedBooking: Booking = {
        id: bookingData.id,
        title: bookingData.title || 'Service Booking',
        status: bookingData.status,
        service: {
          name: (bookingData.services as any)?.title || 'Unknown Service',
          description: (bookingData.services as any)?.description
        },
        client: {
          full_name: clientProfile?.full_name || `Client (${bookingData.client_id?.substring(0, 8)}...)`,
          email: clientProfile?.email || 'No email available'
        },
        provider: {
          full_name: providerProfile?.full_name || `Provider (${bookingData.provider_id?.substring(0, 8)}...)`,
          email: providerProfile?.email || 'No email available'
        },
        created_at: bookingData.created_at,
        scheduled_date: bookingData.scheduled_date,
        total_price: bookingData.total_price || bookingData.amount || 0,
        currency: bookingData.currency || 'OMR'
      }

      console.log('Booking data loaded:', {
        id: transformedBooking.id,
        clientName: transformedBooking.client.full_name,
        providerName: transformedBooking.provider.full_name,
        serviceName: transformedBooking.service.name
      })

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

  const handleRefresh = async () => {
    toast.info('Refreshing booking data...')
    await loadBookingData()
    toast.success('Booking data refreshed')
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
                    <span className="font-medium">Name:</span> 
                    <span className={booking.client.full_name.includes('Client (') ? 'text-gray-500 italic' : ''}>
                      {booking.client.full_name}
                    </span>
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Email:</span> 
                    <span className={booking.client.email === 'No email available' ? 'text-gray-500 italic' : ''}>
                      {booking.client.email}
                    </span>
                  </p>
                  {booking.client.full_name.includes('Client (') && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Profile data not available
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Provider Information</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Name:</span> 
                    <span className={booking.provider.full_name.includes('Provider (') ? 'text-gray-500 italic' : ''}>
                      {booking.provider.full_name}
                    </span>
                  </p>
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Email:</span> 
                    <span className={booking.provider.email === 'No email available' ? 'text-gray-500 italic' : ''}>
                      {booking.provider.email}
                    </span>
                  </p>
                  {booking.provider.full_name.includes('Provider (') && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Profile data not available
                    </p>
                  )}
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