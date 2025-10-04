import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export interface Booking {
  id: string
  title: string
  status: string
  approval_status?: string
  client_id?: string
  provider_id?: string
  service: {
    name: string
    title?: string
    description?: string
    category?: string
    duration?: string
    requirements?: string[]
    deliverables?: string[]
  }
  client: {
    full_name: string
    email: string
    company_name?: string
    avatar_url?: string
    phone?: string
    response_time?: string
    timezone?: string
    preferred_contact?: string
    rating?: number
    total_reviews?: number
    availability_status?: string
  }
  provider: {
    full_name: string
    email: string
    company_name?: string
    avatar_url?: string
    phone?: string
    response_time?: string
    specialization?: string[]
    rating?: number
    total_reviews?: number
    availability_status?: string
  }
  created_at: string
  scheduled_date: string
  scheduled_time?: string
  total_price: number
  amount?: number
  currency: string
  priority?: string
  progress_percentage?: number
  payment_status?: string
  rating?: number
  client_satisfaction?: string
  location?: string
  location_type?: string
  estimated_completion?: string
  actual_completion?: string
  description?: string
  notes?: string
}

type UserRole = 'client' | 'provider' | 'admin'

interface UseBookingDetailsReturn {
  booking: Booking | null
  userRole: UserRole | null
  currentUserId: string | null
  loading: boolean
  error: string | null
  actionBusy: 'approve' | 'decline' | 'start_project' | null
  loadBookingData: () => Promise<void>
  handleAction: (action: 'approve' | 'decline' | 'start_project') => Promise<void>
  normalizeStatus: (b: Booking) => string
}

export function useBookingDetails(bookingId: string): UseBookingDetailsReturn {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState<'approve' | 'decline' | 'start_project' | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadBookingData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('User not authenticated. Please sign in again.')
      const user = session.user
      setCurrentUserId(user.id)

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
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
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
  }, [bookingId])

  const handleAction = useCallback(async (action: 'approve' | 'decline' | 'start_project') => {
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
  }, [booking?.id, loadBookingData])

  const normalizeStatus = useCallback((b: Booking) => b.status ?? b.approval_status, [])

  useEffect(() => {
    // Add a small delay to allow middleware to process
    const timer = setTimeout(() => {
      loadBookingData()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [loadBookingData])

  return {
    booking,
    userRole,
    currentUserId,
    loading,
    error,
    actionBusy,
    loadBookingData,
    handleAction,
    normalizeStatus
  }
}