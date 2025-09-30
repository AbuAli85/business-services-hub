'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Download, Share2, Settings, User, Shield, Eye, AlertTriangle, Target } from 'lucide-react'
import { ProfessionalMilestoneSystem } from '@/components/dashboard/professional-milestone-system'
import { ProfessionalMilestoneManager } from '@/components/dashboard/professional-milestone-manager'
import { ClientMilestoneViewer } from '@/components/dashboard/client-milestone-viewer'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { SmartBookingStatusComponent } from '@/components/dashboard/smart-booking-status'

interface Booking {
  id: string
  title: string
  status: string
  approval_status?: string
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
    // Add a small delay to allow middleware to process
    const timer = setTimeout(() => {
      loadBookingData()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [bookingId])

  // Realtime updates for this booking's milestones and booking status
  useEffect(() => {
    let channelMilestones: any
    let channelBooking: any
    let isMounted = true

    const setup = async () => {
      try {
        const supabase = await getSupabaseClient()
        if (!isMounted) return

        // Create filter strings inside the useEffect where bookingId is available
        const milestoneFilter = `booking_id=eq.${bookingId}`
        const bookingFilter = `id=eq.${bookingId}`

        channelMilestones = supabase
          .channel(`milestones-${bookingId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'milestones',
            filter: milestoneFilter
          }, () => {
            if (!isMounted) return
            loadBookingData()
          })
          .subscribe()

        channelBooking = supabase
          .channel(`booking-${bookingId}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: bookingFilter
          }, () => {
            if (!isMounted) return
            loadBookingData()
          })
          .subscribe()
      } catch (e) {
        console.warn('Realtime setup failed:', e)
      }
    }

    setup()

    return () => {
      isMounted = false
      ;(async () => {
        try {
          const supabase = await getSupabaseClient()
          if (channelMilestones) supabase.removeChannel(channelMilestones)
          if (channelBooking) supabase.removeChannel(channelBooking)
        } catch {}
      })()
    }
  }, [bookingId])

  const loadBookingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      
      // Get current user
      let user = null
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()
      if (userError || !authUser) {
        console.error('Authentication error:', userError)
        // Try to refresh the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          throw new Error('User not authenticated. Please sign in again.')
        }
        // If we have a session but no user, try to get user from session
        const { data: { user: sessionUser }, error: sessionUserError } = await supabase.auth.getUser()
        if (sessionUserError || !sessionUser) {
          throw new Error('User not authenticated. Please sign in again.')
        }
        user = sessionUser
      } else {
        user = authUser
      }
      
      if (!user) {
        throw new Error('User not authenticated. Please sign in again.')
      }

      // Load booking details with separate profile queries for reliability
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
        approval_status: (bookingData as any)?.approval_status,
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Professional Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Bookings
                </Button>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    {booking.title}
                  </h1>
                  <p className="text-blue-100 text-lg mt-1">
                    {booking.service.name} • {booking.client.full_name}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className="bg-white/20 text-white border-white/30">
                      {booking.status}
                    </Badge>
                    <span className="text-sm text-blue-200">
                      Created {new Date(booking.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Role Badge */}
                <Badge 
                  className={
                    userRole === 'provider' ? 'bg-blue-500/20 text-blue-100 border-blue-300/30' :
                    userRole === 'client' ? 'bg-green-500/20 text-green-100 border-green-300/30' :
                    'bg-purple-500/20 text-purple-100 border-purple-300/30'
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
                
                {/* Quick Actions: approve/decline/start */}
                {(() => {
                  const isApproved = ((booking as any)?.approval_status === 'approved') || (booking?.status === 'approved') || (booking?.status === 'confirmed')
                  const isPending = ((booking as any)?.approval_status === 'pending') || (booking?.status === 'pending')
                  const canApprove = (userRole === 'admin' || userRole === 'provider') && isPending
                  const canStart = (userRole === 'provider' || userRole === 'admin') && (isApproved || booking?.status === 'in_progress')
                  return (
                    <div className="flex items-center gap-2">
                      {canApprove && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={async () => {
                            try {
                              const supabase = await getSupabaseClient()
                              const { data: { session } } = await supabase.auth.getSession()
                              const res = await fetch('/api/bookings', {
                                method: 'PATCH',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                body: JSON.stringify({ booking_id: booking?.id, action: 'approve' })
                              })
                              if (!res.ok) throw new Error('Approval failed')
                              toast.success('Booking approved')
                              await loadBookingData()
                            } catch (e:any) { toast.error(e?.message || 'Failed') }
                          }}
                        >
                          Approve
                        </Button>
                      )}
                      {canApprove && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              const supabase = await getSupabaseClient()
                              const { data: { session } } = await supabase.auth.getSession()
                              const res = await fetch('/api/bookings', {
                                method: 'PATCH',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                body: JSON.stringify({ booking_id: booking?.id, action: 'decline' })
                              })
                              if (!res.ok) throw new Error('Decline failed')
                              toast.success('Booking declined')
                              await loadBookingData()
                            } catch (e:any) { toast.error(e?.message || 'Failed') }
                          }}
                        >
                          Decline
                        </Button>
                      )}
                      {canStart && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const supabase = await getSupabaseClient()
                              const { data: { session } } = await supabase.auth.getSession()
                              const res = await fetch('/api/bookings', {
                                method: 'PATCH',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                                body: JSON.stringify({ booking_id: booking?.id, action: 'start_project' })
                              })
                              if (!res.ok) throw new Error('Start failed')
                              toast.success('Project started')
                              await loadBookingData()
                            } catch (e:any) { toast.error(e?.message || 'Failed') }
                          }}
                        >
                          Start Project
                        </Button>
                      )}
                    </div>
                  )
                })()}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Project Details Card */}
          <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Project Details</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Service</p>
                  <p className="text-gray-900 font-medium">{booking.service.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {booking.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Created</p>
                  <p className="text-gray-900">{new Date(booking.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Value</p>
                  <p className="text-gray-900 font-semibold">{booking.total_price} {booking.currency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Client Information Card */}
          <Card className="bg-gradient-to-br from-white to-green-50 border-green-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className={`text-gray-900 ${booking.client.full_name.includes('Client (') ? 'italic text-gray-500' : 'font-medium'}`}>
                    {booking.client.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className={`text-gray-900 ${booking.client.email === 'No email available' ? 'italic text-gray-500' : ''}`}>
                    {booking.client.email}
                  </p>
                </div>
                {booking.client.full_name.includes('Client (') && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Profile data not available
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Provider Information Card */}
          <Card className="bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Provider Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className={`text-gray-900 ${booking.provider.full_name.includes('Provider (') ? 'italic text-gray-500' : 'font-medium'}`}>
                    {booking.provider.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className={`text-gray-900 ${booking.provider.email === 'No email available' ? 'italic text-gray-500' : ''}`}>
                    {booking.provider.email}
                  </p>
                </div>
                {booking.provider.full_name.includes('Provider (') && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Profile data not available
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Smart Status Overview */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">Smart Status Overview</CardTitle>
                  <p className="text-blue-100 text-sm">Real-time project progress and status tracking</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <SmartBookingStatusComponent 
              bookingId={bookingId} 
              userRole={userRole}
              onStatusChangeAction={() => loadBookingData()}
            />
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