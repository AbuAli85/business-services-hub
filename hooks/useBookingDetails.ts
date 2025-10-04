import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export interface Booking {
  id: string
  title: string
  booking_title?: string
  status: string
  display_status?: string
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
  progress?: number
  total_milestones?: number
  completed_milestones?: number
  payment_status?: string
  invoice_status?: string
  invoice_id?: string
  rating?: number
  client_satisfaction?: string
  location?: string
  location_type?: string
  estimated_completion?: string
  actual_completion?: string
  description?: string
  notes?: string
  requirements?: string
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

      // Load booking details from v_booking_status view for unified data
      const { data: bookingData, error: bookingError } = await supabase
        .from('v_booking_status')
        .select(`
          id,
          booking_title,
          service_id,
          service_title,
          service_description,
          service_category,
          client_id,
          client_name,
          client_email,
          client_company,
          client_avatar,
          provider_id,
          provider_name,
          provider_email,
          provider_company,
          provider_avatar,
          progress,
          total_milestones,
          completed_milestones,
          raw_status,
          approval_status,
          display_status,
          payment_status,
          invoice_status,
          invoice_id,
          amount_cents,
          amount,
          currency,
          created_at,
          updated_at,
          due_at,
          requirements,
          notes,
          scheduled_date,
          location
        `)
        .eq('id', bookingId)
        .single()

      if (bookingError) {
        throw new Error(`Failed to load booking: ${bookingError.message}`)
      }

      // Data is now enriched from v_booking_status view - no need for separate API calls
      // Create client and provider profiles from the view data
      const clientProfile = bookingData ? {
        id: bookingData.client_id,
        full_name: bookingData.client_name,
        email: bookingData.client_email,
        company_name: bookingData.client_company,
        avatar_url: bookingData.client_avatar
      } : null

      const providerProfile = bookingData ? {
        id: bookingData.provider_id,
        full_name: bookingData.provider_name,
        email: bookingData.provider_email,
        company_name: bookingData.provider_company,
        avatar_url: bookingData.provider_avatar
      } : null

      // Create service object from view data
      const service = bookingData ? {
        id: bookingData.service_id,
        title: bookingData.service_title,
        description: bookingData.service_description,
        category: bookingData.service_category
      } : null

      // Transform booking data from v_booking_status view
      const transformedBooking: Booking = {
        id: bookingData.id,
        title: bookingData.booking_title || 'Service Booking',
        status: bookingData.display_status,
        approval_status: bookingData.approval_status,
        client_id: bookingData.client_id,
        provider_id: bookingData.provider_id,
        service: {
          name: service?.title || 'Unknown Service',
          description: service?.description,
          category: service?.category
        },
        client: {
          full_name: clientProfile?.full_name || `Client (${bookingData.client_id?.slice(0, 8) ?? 'unknown'})`,
          email: clientProfile?.email || 'No email available',
          company_name: clientProfile?.company_name || undefined
        },
        provider: {
          full_name: providerProfile?.full_name || `Provider (${bookingData.provider_id?.slice(0, 8) ?? 'unknown'})`,
          email: providerProfile?.email || 'No email available',
          company_name: providerProfile?.company_name || undefined
        },
        created_at: bookingData.created_at,
        scheduled_date: bookingData.scheduled_date,
        total_price: bookingData.amount || 0,
        currency: bookingData.currency || 'OMR',
        progress: bookingData.progress || 0,
        total_milestones: bookingData.total_milestones || 0,
        completed_milestones: bookingData.completed_milestones || 0,
        payment_status: bookingData.payment_status,
        invoice_status: bookingData.invoice_status,
        invoice_id: bookingData.invoice_id,
        requirements: bookingData.requirements,
        notes: bookingData.notes,
        location: bookingData.location
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