'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Download, Share2, Settings, User, Shield, Eye, AlertTriangle, Target } from 'lucide-react'
import { ProfessionalMilestoneSystem } from '@/components/dashboard/professional-milestone-system'
import { ClientMilestoneViewer } from '@/components/dashboard/client-milestone-viewer'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { SmartBookingStatusComponent } from '@/components/dashboard/smart-booking-status'
import { smartBookingStatusService } from '@/lib/smart-booking-status'

interface Booking {
  id: string
  title: string
  status: string
  approval_status?: string
  client_id?: string
  provider_id?: string
  service: {
    name: string
    description?: string
  }
  client: {
    full_name: string
    email: string
    company_name?: string
  }
  provider: {
    full_name: string
    email: string
    company_name?: string
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
  const [actionBusy, setActionBusy] = useState<null | 'approve' | 'decline' | 'start_project'>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [milestonesCompleted, setMilestonesCompleted] = useState<number | null>(null)
  const [milestonesTotal, setMilestonesTotal] = useState<number | null>(null)
  const [smartStatus, setSmartStatus] = useState<string | null>(null)

  useEffect(() => {
    // Add a small delay to allow middleware to process
    const timer = setTimeout(() => {
      loadBookingData()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [bookingId])

  // Load computed smart status for header badge
  useEffect(() => {
    let isMounted = true
    const loadSmart = async () => {
      try {
        if (!bookingId) return
        const result = await smartBookingStatusService.getSmartStatus(bookingId, userRole)
        if (!isMounted) return
        setSmartStatus(result.overall_status)
      } catch {
        if (!isMounted) return
        setSmartStatus(null)
      }
    }
    loadSmart()
    return () => { isMounted = false }
  }, [bookingId, userRole])

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
          if (channelMilestones?.unsubscribe) await channelMilestones.unsubscribe()
          if (channelBooking?.unsubscribe) await channelBooking.unsubscribe()
        } catch {}
      })()
    }
  }, [bookingId])

  const loadBookingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('User not authenticated. Please sign in again.')
      const user = session.user

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
            .select('id, full_name, email, company_name')
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
            .select('id, full_name, email, company_name')
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
      const svc = Array.isArray((bookingData as any).services) ? (bookingData as any).services[0] : (bookingData as any).services
      const transformedBooking: Booking = {
        id: bookingData.id,
        title: bookingData.title || 'Service Booking',
        status: bookingData.status,
        approval_status: (bookingData as any)?.approval_status,
        client_id: bookingData.client_id,
        provider_id: bookingData.provider_id,
        service: {
          name: svc?.title || 'Unknown Service',
          description: svc?.description
        },
        client: {
          full_name: clientProfile?.full_name || `Client (${bookingData.client_id?.slice(0, 8) ?? 'unknown'})`,
          email: clientProfile?.email || 'No email available',
          company_name: (clientProfile as any)?.company_name || undefined
        },
        provider: {
          full_name: providerProfile?.full_name || `Provider (${bookingData.provider_id?.slice(0, 8) ?? 'unknown'})`,
          email: providerProfile?.email || 'No email available',
          company_name: (providerProfile as any)?.company_name || undefined
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

  // Load KPIs (milestones completed/total) once booking is available
  useEffect(() => {
    let isMounted = true
    const loadKpis = async () => {
      if (!booking?.id) return
      try {
        setKpiLoading(true)
        const supabase = await getSupabaseClient()
        // Total milestones
        const { count: totalCount } = await supabase
          .from('milestones')
          .select('id', { count: 'exact', head: true })
          .eq('booking_id', booking.id)

        // Completed milestones
        const { count: completedCount } = await supabase
          .from('milestones')
          .select('id', { count: 'exact', head: true })
          .eq('booking_id', booking.id)
          .eq('status', 'completed')

        if (!isMounted) return
        setMilestonesTotal(totalCount ?? 0)
        setMilestonesCompleted(completedCount ?? 0)
      } catch (e) {
        // Non-blocking KPI failure
        if (!isMounted) return
        setMilestonesTotal(null)
        setMilestonesCompleted(null)
        try { toast.warning('Unable to load milestone KPIs') } catch {}
      } finally {
        if (isMounted) setKpiLoading(false)
      }
    }
    loadKpis()
    return () => { isMounted = false }
  }, [booking?.id])

  const handleRefresh = async () => {
    toast.info('Refreshing booking data...')
    await loadBookingData()
    toast.success('Booking data refreshed')
  }

  const handleBack = () => {
    router.push('/dashboard/bookings')
  }

  // DRY helper for booking actions
  const handleAction = async (action: 'approve' | 'decline' | 'start_project') => {
    if (!booking?.id) return
    try {
      setActionBusy(action)
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      const actionMessages: Record<string, { loading: string; success: string; error: string }> = {
        approve: { loading: 'Approving…', success: 'Booking approved', error: 'Approval failed' },
        decline: { loading: 'Declining…', success: 'Booking declined', error: 'Decline failed' },
        start_project: { loading: 'Starting project…', success: 'Project started', error: 'Start failed' }
      }
      await toast.promise((async () => {
        const res = await fetch(`/api/bookings`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ booking_id: booking.id, action })
        })
        if (!res.ok) {
          const err: { message?: string; error?: string } = await res.json().catch(() => ({}))
          throw new Error(err.message || err.error || actionMessages[action].error)
        }
      })(), actionMessages[action])
      await loadBookingData()
    } catch (e:any) {
      // toast already shows error via toast.promise; no extra action needed
    } finally {
      setActionBusy(null)
    }
  }

  const normalizeStatus = (b: Booking) => b.approval_status ?? b.status
  const friendlyStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending_review: 'Pending Review',
      ready_to_launch: 'Ready to Launch',
      in_production: 'In Production',
      delivered: 'Delivered',
      approved: 'Approved',
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      on_hold: 'On Hold'
    }
    return map[status] || String(status).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" aria-busy="true">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
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
              <Shield className="h-12 w-12 mx-auto" />
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
                    {(() => {
                      const statusRaw = smartStatus || normalizeStatus(booking)
                      return (
                        <Badge className="bg-white/20 text-white border-white/30">
                          {friendlyStatusLabel(String(statusRaw))}
                        </Badge>
                      )
                    })()}
                    <span className="text-sm text-blue-200">
                      Created {new Date(booking.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Muscat' })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3" aria-live="polite">
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
                  const statusNorm: string = normalizeStatus(booking)
                  const isApprovedOrBetter = ['approved', 'confirmed', 'in_progress', 'completed'].includes(String(statusNorm))
                  const isPending = statusNorm === 'pending'
                  const canApprove = (userRole === 'admin' || userRole === 'provider') && isPending
                  // Only allow start when in an approvable state (approved/confirmed), not when already in progress or completed
                  const canStart = (userRole === 'provider' || userRole === 'admin') && ['approved', 'confirmed'].includes(String(statusNorm))
                  return (
                    <div className="flex items-center gap-2">
                      {canApprove && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={actionBusy !== null}
                          onClick={() => handleAction('approve')}
                        >
                          {actionBusy === 'approve' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Approve'}
                        </Button>
                      )}
                      {canApprove && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={actionBusy !== null}
                          onClick={() => handleAction('decline')}
                        >
                          {actionBusy === 'decline' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Decline'}
                        </Button>
                      )}
                      {canStart && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionBusy !== null}
                          onClick={() => handleAction('start_project')}
                        >
                          {actionBusy === 'start_project' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Start Project'}
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
                  {booking.service.description && (
                    <p className="text-sm text-gray-600 mt-1">{booking.service.description}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    {normalizeStatus(booking).toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Created</p>
                  <p className="text-gray-900">{new Date(booking.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Muscat' })}</p>
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Client (Requester): {booking.client.full_name}</h3>
                  {booking.client.company_name && (
                    <p className="text-xs text-gray-500">{booking.client.company_name}</p>
                  )}
                </div>
              </div>
              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className={`text-gray-900 ${booking.client.email === 'No email available' ? 'italic text-gray-500' : ''}`} title={[booking.client.email, booking.client.company_name].filter(Boolean).join(' • ')}>
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Provider (Service Owner): {booking.provider.full_name}</h3>
                  {booking.provider.company_name && (
                    <p className="text-xs text-gray-500">{booking.provider.company_name}</p>
                  )}
                </div>
              </div>
              <div className="space-y-3 mt-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className={`text-gray-900 ${booking.provider.email === 'No email available' ? 'italic text-gray-500' : ''}`} title={[booking.provider.email, booking.provider.company_name].filter(Boolean).join(' • ')}>
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
        {(() => {
          const statusNorm = booking ? normalizeStatus(booking) : 'pending'
          const isGood = ['approved', 'confirmed', 'in_progress'].includes(String(statusNorm))
          const isWarn = String(statusNorm) === 'pending'
          const isBad = ['declined', 'cancelled', 'overdue'].includes(String(statusNorm))
          const cardGradient = isGood
            ? 'from-green-50 to-emerald-50 border-green-200'
            : isWarn
            ? 'from-amber-50 to-yellow-50 border-amber-200'
            : isBad
            ? 'from-red-50 to-rose-50 border-red-200'
            : 'from-blue-50 to-indigo-50 border-blue-200'
          const headerGradient = isGood
            ? 'from-green-600 to-emerald-600'
            : isWarn
            ? 'from-amber-600 to-yellow-600'
            : isBad
            ? 'from-red-600 to-rose-600'
            : 'from-blue-600 to-indigo-600'
          const kpiColor = isGood
            ? 'text-green-600'
            : isWarn
            ? 'text-amber-600'
            : isBad
            ? 'text-red-600'
            : 'text-blue-600'
          return (
            <Card className={`mb-8 bg-gradient-to-r ${cardGradient} shadow-lg`}>
              <CardHeader className={`bg-gradient-to-r ${headerGradient} text-white rounded-t-lg`}>
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
                {/* KPI summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className={`text-sm ${kpiColor}`}>Completion</p>
                    {kpiLoading ? (
                      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      <p className="text-lg font-semibold">
                        {milestonesTotal !== null && milestonesTotal > 0 && milestonesCompleted !== null
                          ? `${Math.round((milestonesCompleted! / milestonesTotal) * 100)}%`
                          : '—'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm ${kpiColor}`}>Milestones</p>
                    {kpiLoading ? (
                      <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      milestonesTotal === 0 ? (
                        <p className="text-sm italic text-gray-600">No milestones yet</p>
                      ) : (
                        <p className="text-lg font-semibold">
                          {milestonesCompleted ?? '—'} / {milestonesTotal ?? '—'}
                        </p>
                      )
                    )}
                  </div>
                  <div>
                    <p className={`text-sm ${kpiColor}`}>Deadline</p>
                    <p className="text-lg font-semibold">
                      {booking?.scheduled_date
                        ? new Date(booking.scheduled_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Muscat' })
                        : '—'}
                    </p>
                  </div>
                </div>
                <div aria-live="polite">
                  {kpiLoading && !milestonesTotal ? (
                    <div className="h-20 bg-gray-100 animate-pulse rounded" />
                  ) : (
                    <SmartBookingStatusComponent 
                      bookingId={bookingId} 
                      userRole={userRole}
                      onStatusChangeAction={() => loadBookingData()}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Professional Milestone System - gated by status */}
        {(() => {
          const statusNorm = normalizeStatus(booking)
          const canSeeMilestones = ['approved', 'confirmed', 'in_progress', 'completed'].includes(String(statusNorm))
          if (!canSeeMilestones) {
            return (
              <Card className="p-6 text-center text-gray-600">
                Milestones will be available once this booking is approved.
              </Card>
            )
          }
          return userRole === 'provider' ? (
            <ProfessionalMilestoneSystem bookingId={bookingId} />
          ) : (
            <ClientMilestoneViewer bookingId={bookingId} />
          )
        })()}
      </div>
    </div>
  )
}