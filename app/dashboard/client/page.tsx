'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
// Uses shared dashboard layout (sidebar/header) from app/dashboard/layout.tsx
import { EnhancedClientKPIGrid, EnhancedClientPerformanceMetrics } from '@/components/dashboard/enhanced-client-kpi-cards'
import { PremiumClientBookings } from '@/components/dashboard/premium-client-bookings'
import { EliteServiceSuggestions } from '@/components/dashboard/elite-service-suggestions'
import { getSupabaseClient } from '@/lib/supabase'
import { realtimeManager } from '@/lib/realtime'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  AlertCircle,
  Star,
  Target
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { ClientDashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'
import { logger } from '@/lib/logger'

interface ClientStats {
  totalBookings: number
  activeBookings: number
  completedBookings: number
  totalSpent: number
  monthlySpent: number
  averageRating: number
  totalReviews: number
  favoriteProviders: number
}

interface ServiceSuggestion {
  id: string
  suggested_service: {
    id: string
    title: string
    description: string
    base_price: number
    currency: string
    category: string
  }
  provider: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  suggestion_reason: string
  priority: string
  status: string
  created_at: string
}

interface RecentBooking {
  id: string
  service_title: string
  provider_name: string
  provider_company?: string
  status: string
  amount: number
  currency: string
  scheduled_date: string
  created_at: string
}

interface UpcomingBooking {
  id: string
  service_title: string
  provider_name: string
  scheduled_date: string
  scheduled_time: string
  location?: string
  status: string
}

export default function ClientDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  
  // Dashboard data
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([])
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([])

  // Check auth and load data on mount with mounted guard
  useEffect(() => {
    // Check sessionStorage to prevent re-runs across component instances
    if (typeof window !== 'undefined' && sessionStorage.getItem('client-dashboard-auth-checked') === 'true') {
      console.log('⏭️ Auth already checked, skipping')
      setLoading(false)
      return
    }
    
    console.log('🏠 Client dashboard mounted')
    let isMounted = true
    const controller = new AbortController()

    const init = async () => {
      try {
        console.log('🔐 Checking authentication...')
        const supabase = await getSupabaseClient()
        
        // Add timeout safety (5s for auth)
        const authTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        
        const { data: { user }, error: userError } = (await Promise.race([
          supabase.auth.getUser(),
          authTimeout
        ])) as any

        if (!isMounted) return

        if (userError || !user) {
          console.log('❌ No user found, redirecting to sign-in')
          if (isMounted) router.replace('/auth/sign-in')
          return
        }

        // Determine role
        let userRole = user.user_metadata?.role
        if (!userRole) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          userRole = profile?.role || 'client'
        }

        if (!isMounted) return

        console.log('✅ User authenticated:', user.email, '| Role:', userRole)

        // Handle redirect logic cleanly
        if (userRole !== 'client') {
          console.log(`🔄 Redirecting ${userRole} to their dashboard`)
          if (isMounted) {
            setRedirecting(true)
            const dashboardUrl = userRole === 'provider' 
              ? '/dashboard/provider'
              : '/dashboard'
            router.replace(dashboardUrl)
          }
          return
        }

      // Client user - set user and load data
      console.log('👤 Client user confirmed, loading data...')
      if (isMounted) {
        setUser(user)
        // Mark auth as checked for this session
        sessionStorage.setItem('client-dashboard-auth-checked', 'true')
      }

        // Load data with timeout safety (8s for data)
        const dataTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Data timeout')), 8000)
        )

        try {
          await Promise.race([fetchAllClientData(user.id), dataTimeout])
          if (isMounted) console.log('✅ Data loaded successfully')
        } catch (dataError) {
          if (!isMounted) return
          logger.warn('⚠️ Error fetching client data:', dataError)
          setStats(defaultStats())
          toast.error('Some data could not be loaded')
        } finally {
          if (isMounted) setLoading(false)
        }
      } catch (error) {
        if (!isMounted) return
        logger.error('❌ Auth check failed:', error)
        setError('Failed to load dashboard')
        toast.error('Failed to load dashboard')
        setLoading(false)
      } finally {
        if (isMounted) setLoading(false)
        controller.abort()
      }
    }

    init()

    return () => {
      console.log('🧹 Client dashboard cleanup')
      isMounted = false
      controller.abort()
    }
  }, [])

  // Real-time updates (ONLY for critical updates, not continuous refresh)
  useEffect(() => {
    if (!user?.id) return

    let subscriptionKeys: string[] = []

    ;(async () => {
      try {
        // Only subscribe to booking status changes, not all data refreshes
        const bookingSubscription = await realtimeManager.subscribeToBookings(user.id, () => {
          // Only refresh if there are actual changes, not on every update
          console.log('📡 Booking update received, refreshing data...')
          fetchAllClientData(user.id)
        })
        subscriptionKeys.push(`bookings:${user.id}`)

        // Remove service suggestions subscription to reduce load
        // Service suggestions can be loaded manually when needed
      } catch (error) {
        logger.warn('Error setting up realtime subscriptions:', error)
      }
    })()

    return () => {
      subscriptionKeys.forEach(key => realtimeManager.unsubscribe(key))
    }
  }, [user?.id])


  const fetchAllClientData = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()

      // One bookings query (client-specific, indexed path)
      const eighteenMonthsAgo = new Date()
      eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18)

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          provider_id,
          status,
          subtotal,
          total_amount,
          currency,
          created_at,
          start_time,
          scheduled_date
        `)
        .eq('client_id', userId)
        .gte('created_at', eighteenMonthsAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (bookingsError) {
        logger.error('Error fetching bookings:', bookingsError)
        setRecentBookings([])
        setUpcomingBookings([])
        setStats(defaultStats())
        return
      }

      // Services and providers lookups for enrichment
      const serviceIds = Array.from(new Set((bookings || []).map((b: any) => b.service_id).filter(Boolean)))
      const providerIds = Array.from(new Set((bookings || []).map((b: any) => b.provider_id).filter(Boolean)))

      // Add timeout protection for all queries
      const queryController = new AbortController()
      const queryTimeout = setTimeout(() => queryController.abort(), 8000) // 8 second timeout
      
      const [servicesResponse, providersResponse, reviewsResponse] = await Promise.allSettled([
        serviceIds.length ? supabase.from('services').select('id, title').in('id', serviceIds).abortSignal(queryController.signal) : Promise.resolve({ data: [], error: null } as any),
        providerIds.length ? supabase.from('profiles').select('id, full_name, company_name').in('id', providerIds).abortSignal(queryController.signal) : Promise.resolve({ data: [], error: null } as any),
        supabase.from('reviews').select('rating').eq('client_id', userId).abortSignal(queryController.signal)
      ])
      
      clearTimeout(queryTimeout)

      // Handle Promise.allSettled results
      const services = servicesResponse.status === 'fulfilled' ? (servicesResponse.value as any).data || [] : []
      const providers = providersResponse.status === 'fulfilled' ? (providersResponse.value as any).data || [] : []
      const reviews = reviewsResponse.status === 'fulfilled' ? (reviewsResponse.value as any).data || [] : []
      
      // Handle query errors gracefully
      if (servicesResponse.status === 'rejected') {
        console.warn('⏰ Services query failed, continuing without service names:', servicesResponse.reason)
      } else if (servicesResponse.status === 'fulfilled' && (servicesResponse.value as any).error) {
        const error = (servicesResponse.value as any).error
        if (error.code === '57014' || error.message?.includes('timeout') || error.message?.includes('canceling statement')) {
          console.warn('⏰ Services query timed out, continuing without service names')
        } else {
          console.warn('⚠️ Services query failed:', error)
        }
      }
      
      if (providersResponse.status === 'rejected') {
        console.warn('⏰ Profile enrichment query failed, continuing without provider names:', providersResponse.reason)
      } else if (providersResponse.status === 'fulfilled' && (providersResponse.value as any).error) {
        const error = (providersResponse.value as any).error
        if (error.code === '57014' || error.message?.includes('timeout') || error.message?.includes('canceling statement')) {
          console.warn('⏰ Profile enrichment query timed out, continuing without provider names')
        } else if (error.code === '54001') {
          console.warn('⏰ Stack depth limit exceeded in profile query, continuing without provider names')
        } else {
          console.warn('⚠️ Profile enrichment query failed:', error)
        }
      }
      
      if (reviewsResponse.status === 'rejected') {
        console.warn('⏰ Reviews query failed, continuing without reviews:', reviewsResponse.reason)
      }

      // Compute stats from a single dataset
      const totalBookings = bookings?.length || 0
      const activeBookings = bookings?.filter(b => ['paid', 'in_progress'].includes(b.status)).length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0

      const totalSpent = (bookings || [])
        .filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b: any) => {
          const subtotal = b.subtotal || b.total_amount || 0
          const vatAmount = subtotal * 0.05
          return sum + subtotal + vatAmount
        }, 0)

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const monthlySpent = (bookings || [])
        .filter((b: any) => {
          const d = new Date(b.created_at)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && ['completed', 'in_progress'].includes(b.status)
        })
        .reduce((sum, b: any) => {
          const subtotal = b.subtotal || b.total_amount || 0
          const vatAmount = subtotal * 0.05
          return sum + subtotal + vatAmount
        }, 0)

      const totalReviews = reviews.length || 0
      const averageRating = totalReviews > 0 ? (reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / totalReviews) : 0

      setStats({
        totalBookings,
        activeBookings,
        completedBookings,
        totalSpent,
        monthlySpent,
        averageRating,
        totalReviews,
        favoriteProviders: 0
      })

      // Enrich bookings once
      const enrich = (b: any) => {
        const service = services.find((s: any) => s.id === b.service_id)
        const provider = providers.find((p: any) => p.id === b.provider_id)
        return {
          ...b,
          service_title: service?.title || 'Unknown Service',
          provider_name: provider?.full_name || `Provider ${b.provider_id?.slice(-8) || 'Unknown'}`,
          provider_company: provider?.company_name || provider?.full_name || `Provider ${b.provider_id?.slice(-8) || 'Unknown'}`,
          amount: b.total_amount || (b.subtotal ? b.subtotal + (b.subtotal * 0.05) : 0),
          scheduled_date: b.scheduled_date || b.start_time || b.created_at
        }
      }

      const recent = (bookings || []).slice(0, 5).map(enrich)
      const upcoming = (bookings || [])
        .filter((b: any) => ['paid', 'in_progress'].includes(b.status))
        .slice(0, 3)
        .map((b: any) => ({
          ...enrich(b),
          scheduled_time: b.start_time ? new Date(b.start_time).toLocaleTimeString() : 'TBD',
          location: 'TBD'
        }))

      setRecentBookings(recent)
      setUpcomingBookings(upcoming)

      await fetchServiceSuggestions(userId)
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        logger.warn('Bookings load aborted due to timeout')
      } else {
        logger.error('Error fetching client data:', error)
      }
      setStats(defaultStats())
      setRecentBookings([])
      setUpcomingBookings([])
      // Do not flip loading here; UI already rendered
    }
  }

  const fetchServiceSuggestions = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const response = await fetch('/api/service-suggestions?type=received&status=pending&limit=5', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) return

      const data = await response.json()
      setServiceSuggestions(data.suggestions || [])
    } catch (error) {
      logger.error('Error fetching service suggestions:', error)
      setServiceSuggestions([])
    }
  }

  const handleRefresh = async () => {
    if (!user?.id) return
    try {
      setRefreshing(true)
      await fetchAllClientData(user.id)
      toast.success('Dashboard refreshed')
    } catch (err) {
      logger.error('Error refreshing dashboard:', err)
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  const defaultStats = (): ClientStats => ({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    monthlySpent: 0,
    averageRating: 0,
    totalReviews: 0,
    favoriteProviders: 0
  })

  const userFullName = useMemo(() => user?.user_metadata?.full_name || '', [user?.user_metadata?.full_name])

  // Show redirecting state
  if (redirecting) {
    return (
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Redirecting to your dashboard...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Show error state
  if (error || !stats) {
    return (
      <main className="p-6">
        <div className="flex items-center justify-center h-screen text-red-600">
          <div className="text-center">
            <p className="mb-4">{error || 'Failed to load dashboard data'}</p>
            <Button
              onClick={() => location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <ClientDashboardErrorBoundary>
      <main className="p-3 sm:p-4 lg:p-6 xl:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Client Dashboard</h1>
              <p className="text-gray-600">{`Welcome back${userFullName ? `, ${userFullName}` : ''}! Here's your booking overview`}</p>
            </div>
            <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Welcome Section removed per request to avoid duplicate cards */}
          {false && (
          <div className="mb-8 sm:mb-10">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 rounded-3xl -m-6 sm:-m-8 lg:-m-10"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-3xl -m-6 sm:-m-8 lg:-m-10"></div>
              <div className="relative bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/30 shadow-2xl p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          Your Service Hub
                        </h2>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base lg:text-lg">Discover, book, and manage your professional services</p>
                      </div>
                    </div>
                    {/* Single highlight to avoid duplication */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {/* Spending tiles removed for client privacy */}
                      <div className="text-center p-4 bg-white/70 rounded-2xl border border-white/40 shadow">
                        <div className="text-xl font-semibold text-green-600">{stats?.activeBookings || 0}</div>
                        <div className="text-sm text-gray-700">Active</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-2xl border border-white/40 shadow">
                        <div className="text-xl font-semibold text-purple-600">{stats?.completedBookings || 0}</div>
                        <div className="text-sm text-gray-700">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-2xl border border-white/40 shadow">
                        <div className="text-xl font-semibold text-orange-600">{stats?.averageRating ? (stats?.averageRating as number).toFixed(1) : 'N/A'}</div>
                        <div className="text-sm text-gray-700">Avg Rating</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-green-100/80 backdrop-blur-sm rounded-full border border-green-200/50">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Live Dashboard</span>
                    </div>
                    <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm border-white/40">
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* KPI Grid - keep this as the only top overview */}
          <section className="mb-8 sm:mb-10">
            {stats && <EnhancedClientKPIGrid data={stats} />}
          </section>

          {/* Performance Analytics removed per request */}

          {/* Spending analytics removed */}

          {/* Bookings + Service Suggestions */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 mb-8 sm:mb-10">
            <PremiumClientBookings 
              recentBookings={recentBookings} 
              upcomingBookings={upcomingBookings} 
            />
            <EliteServiceSuggestions suggestions={serviceSuggestions} />
          </section>

          {/* Quick Actions & Insights */}
          <section className="mb-8">
            <div className="relative bg-white/85 backdrop-blur-md rounded-2xl border border-white/30 shadow-2xl p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Quick Actions</h3>
                      <p className="text-gray-600 text-sm sm:text-base">Find and book services easily</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button onClick={() => router.push('/dashboard/bookings/create')} className="h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                      <div className="text-center">
                        <div className="text-base font-semibold">Book Service</div>
                        <div className="text-xs opacity-90">Start new project</div>
                      </div>
                    </Button>
                    <Button onClick={() => router.push('/dashboard/messages')} className="h-16 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                      <div className="text-center">
                        <div className="text-base font-semibold">Messages</div>
                        <div className="text-xs opacity-90">Contact providers</div>
                      </div>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 lg:space-y-4 lg:space-x-0 xl:space-y-0 xl:space-x-4">
                  <div className="text-center lg:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats?.totalBookings || 0}</div>
                    <div className="text-sm text-gray-600">Total Bookings</div>
                  </div>
                  <div className="text-center lg:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats?.totalReviews || 0}</div>
                    <div className="text-sm text-gray-600">Reviews Given</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ClientDashboardErrorBoundary>
  )
}