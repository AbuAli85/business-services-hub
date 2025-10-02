import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export interface BookingDetails {
  id: string
  title: string
  description?: string
  status: 'pending' | 'approved' | 'declined' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'rescheduled'
  approval_status?: 'pending' | 'approved' | 'rejected' | 'under_review'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  scheduled_date?: string
  scheduled_time?: string
  estimated_completion?: string
  actual_completion?: string
  notes?: string
  amount: number
  currency: string
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded' | 'overdue'
  payment_method?: string
  progress_percentage: number
  estimated_duration: string
  actual_duration?: string
  location?: string
  location_type: 'on_site' | 'remote' | 'hybrid'
  rating?: number
  review?: string
  client_satisfaction?: number
  provider_rating?: number
  tags: string[]
  attachments: any[]
  milestones: any[]
  issues: any[]
  service_type_id?: string
  service: {
    id: string
    title: string
    description: string
    category: string
    base_price: number
    currency: string
    duration: string
    requirements?: string[]
    deliverables?: string[]
  }
  client: {
    id: string
    full_name: string
    email: string
    phone?: string
    company_name?: string
    avatar_url?: string
    timezone?: string
    preferred_contact?: 'email' | 'phone' | 'message'
    response_time?: string
  }
  provider: {
    id: string
    full_name: string
    email: string
    phone?: string
    company_name?: string
    avatar_url?: string
    specialization?: string[]
    rating?: number
    total_reviews?: number
    response_time?: string
    availability_status?: 'available' | 'busy' | 'offline'
  }
}

export interface UseBookingDetailsOptions {
  userRole?: 'client' | 'provider' | 'admin'
  enableRealtime?: boolean
}

export function useBookingDetails(options: UseBookingDetailsOptions = {}) {
  const { userRole, enableRealtime = false } = options
  const params = useParams()
  const router = useRouter()
  const bookingId = params?.id as string

  const [state, setState] = useState({
    booking: null as BookingDetails | null,
    loading: true,
    error: null as string | null,
    isUpdating: false,
    lastUpdatedAt: null as number | null
  })

  const isLoadingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadBookingData = useCallback(async (force = false) => {
    if (isLoadingRef.current && !force) {
      console.log('⏳ Booking details fetch already in progress, skipping...')
      return
    }

    if (!bookingId) {
      setState(prev => ({ ...prev, error: 'No booking ID provided', loading: false }))
      return
    }

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const ac = new AbortController()
    abortControllerRef.current = ac
    isLoadingRef.current = true

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setState(prev => ({ 
          ...prev, 
          error: 'Authentication required', 
          loading: false 
        }))
        router.push('/auth/sign-in')
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      // Fetch booking data
      const response = await fetch(`/api/bookings/${bookingId}`, {
        headers,
        credentials: 'include',
        signal: ac.signal
      })

      if (!response.ok) {
        if (response.status === 404) {
          setState(prev => ({ 
            ...prev, 
            error: 'Booking not found', 
            loading: false 
          }))
          return
        }
        if (response.status === 403) {
          setState(prev => ({ 
            ...prev, 
            error: 'You do not have permission to view this booking', 
            loading: false 
          }))
          return
        }
        throw new Error(`Failed to load booking: ${response.status}`)
      }

      const { booking: bookingData, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      if (!bookingData) {
        setState(prev => ({ 
          ...prev, 
          error: 'Booking not found', 
          loading: false 
        }))
        return
      }

      // Transform and enhance the booking data
      const enhancedBooking: BookingDetails = {
        ...bookingData,
        id: bookingData.id,
        title: bookingData.title || bookingData.service_title || 'Booking',
        description: bookingData.description || bookingData.notes || '',
        status: bookingData.status || 'pending',
        approval_status: bookingData.approval_status || 'pending',
        priority: bookingData.priority || 'normal',
        created_at: bookingData.created_at,
        updated_at: bookingData.updated_at || bookingData.created_at,
        
        // Financial data
        amount: bookingData.amount || bookingData.total_amount || 0,
        currency: bookingData.currency || 'OMR',
        payment_status: bookingData.payment_status || 'pending',
        payment_method: bookingData.payment_method || '',
        
        // Progress tracking
        progress_percentage: bookingData.project_progress || bookingData.progress_percentage || 0,
        estimated_completion: bookingData.estimated_completion || '',
        actual_completion: bookingData.actual_completion || '',
        
        // Duration and timing
        estimated_duration: bookingData.estimated_duration || bookingData.service?.estimated_duration || '2 hours',
        actual_duration: bookingData.actual_duration || '',
        scheduled_date: bookingData.scheduled_date || bookingData.due_at || '',
        scheduled_time: bookingData.scheduled_time || '',
        
        // Location
        location: bookingData.location || '',
        location_type: bookingData.location_type || 'on_site',
        
        // Ratings and satisfaction
        rating: bookingData.rating || bookingData.client_rating || 0,
        review: bookingData.review || '',
        client_satisfaction: bookingData.client_satisfaction || 0,
        provider_rating: bookingData.provider_rating || 0,
        
        // Arrays with defaults
        tags: bookingData.tags || [],
        attachments: bookingData.attachments || [],
        milestones: bookingData.milestones || [],
        issues: bookingData.issues || [],
        
        // Service data
        service: {
          id: bookingData.service?.id || '',
          title: bookingData.service?.title || bookingData.service_title || 'Service',
          description: bookingData.service?.description || '',
          category: bookingData.service?.category || '',
          base_price: bookingData.service?.base_price || 0,
          currency: bookingData.service?.currency || 'OMR',
          duration: bookingData.service?.duration || '2 hours',
          requirements: bookingData.service?.requirements || [],
          deliverables: bookingData.service?.deliverables || []
        },
        
        // Client data
        client: {
          id: bookingData.client?.id || bookingData.client_id || '',
          full_name: bookingData.client?.full_name || bookingData.client_name || 'Unknown Client',
          email: bookingData.client?.email || bookingData.client_email || '',
          phone: bookingData.client?.phone || '',
          company_name: bookingData.client?.company_name || '',
          avatar_url: bookingData.client?.avatar_url || '',
          timezone: bookingData.client?.timezone || 'Asia/Muscat',
          preferred_contact: bookingData.client?.preferred_contact || 'email',
          response_time: bookingData.client?.response_time || '24 hours'
        },
        
        // Provider data
        provider: {
          id: bookingData.provider?.id || bookingData.provider_id || '',
          full_name: bookingData.provider?.full_name || bookingData.provider_name || 'Unknown Provider',
          email: bookingData.provider?.email || bookingData.provider_email || '',
          phone: bookingData.provider?.phone || '',
          company_name: bookingData.provider?.company_name || '',
          avatar_url: bookingData.provider?.avatar_url || '',
          specialization: bookingData.provider?.specialization || [],
          rating: bookingData.provider?.rating || 0,
          total_reviews: bookingData.provider?.total_reviews || 0,
          response_time: bookingData.provider?.response_time || '24 hours',
          availability_status: bookingData.provider?.availability_status || 'available'
        }
      }

      setState(prev => ({
        ...prev,
        booking: enhancedBooking,
        loading: false,
        lastUpdatedAt: Date.now()
      }))

    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('❌ Booking details loading error:', error)
        setState(prev => ({ 
          ...prev, 
          error: error?.message || 'Failed to load booking details',
          loading: false 
        }))
      }
    } finally {
      isLoadingRef.current = false
    }
  }, [bookingId, router])

  // Update booking status
  const updateBookingStatus = useCallback(async (status: string) => {
    if (!state.booking) return false

    setState(prev => ({ ...prev, isUpdating: true }))

    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/bookings/${state.booking.id}`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error('Failed to update booking status')
      }

      // Reload booking data
      await loadBookingData(true)
      toast.success('Booking status updated')
      return true

    } catch (error: any) {
      console.error('❌ Update booking status error:', error)
      toast.error(error?.message || 'Failed to update booking status')
      return false
    } finally {
      setState(prev => ({ ...prev, isUpdating: false }))
    }
  }, [state.booking, loadBookingData])

  // Approve booking
  const approveBooking = useCallback(async () => {
    if (!state.booking) return false

    if (userRole !== 'admin' && userRole !== 'provider') {
      toast.error('You do not have permission to approve bookings')
      return false
    }

    return await updateBookingStatus('approved')
  }, [state.booking, userRole, updateBookingStatus])

  // Decline booking
  const declineBooking = useCallback(async () => {
    if (!state.booking) return false

    if (userRole !== 'admin' && userRole !== 'provider') {
      toast.error('You do not have permission to decline bookings')
      return false
    }

    return await updateBookingStatus('declined')
  }, [state.booking, userRole, updateBookingStatus])

  // Load data on mount
  useEffect(() => {
    if (bookingId) {
      loadBookingData()
    }
  }, [bookingId, loadBookingData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    ...state,
    loadBookingData,
    updateBookingStatus,
    approveBooking,
    declineBooking,
    refresh: () => loadBookingData(true)
  }
}
