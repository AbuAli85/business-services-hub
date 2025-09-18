'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
// Uses shared dashboard layout (sidebar/header) from app/dashboard/layout.tsx
import { EnhancedClientKPIGrid, EnhancedClientPerformanceMetrics } from '@/components/dashboard/enhanced-client-kpi-cards'
import { AdvancedClientSpendingChart } from '@/components/dashboard/advanced-client-spending-chart'
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
import toast from 'react-hot-toast'
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
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Sidebar/header come from shared dashboard layout
  const [user, setUser] = useState<any>(null)
  
  // Dashboard data
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([])
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([])

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  // Real-time updates (only what we actually need)
  useEffect(() => {
    if (!user?.id) return

    let subscriptionKeys: string[] = []

    ;(async () => {
      try {
        const bookingSubscription = await realtimeManager.subscribeToBookings(user.id, () => {
          fetchAllClientData(user.id)
        })
        subscriptionKeys.push(`bookings:${user.id}`)

        const suggestionsSubscription = await realtimeManager.subscribeToServiceSuggestions(user.id, () => {
          fetchServiceSuggestions(user.id)
        })
        subscriptionKeys.push(`suggestions:${user.id}`)
      } catch (error) {
        logger.warn('Error setting up realtime subscriptions:', error)
      }
    })()

    return () => {
      subscriptionKeys.forEach(key => realtimeManager.unsubscribe(key))
    }
  }, [user?.id])

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = await getSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a client
      const userRole = user.user_metadata?.role
      if (userRole !== 'client') {
        router.push('/dashboard')
        return
      }

      setUser(user)
      await fetchAllClientData(user.id)
    } catch (error) {
      logger.error('Error loading client data:', error)
      setError('Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllClientData = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()

      // One bookings query
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
        .or(`client_id.eq.${userId},user_id.eq.${userId}`)
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

      const [servicesResponse, providersResponse, reviewsResponse] = await Promise.all([
        serviceIds.length ? supabase.from('services').select('id, title').in('id', serviceIds) : Promise.resolve({ data: [], error: null } as any),
        providerIds.length ? supabase.from('profiles').select('id, full_name, company_name').in('id', providerIds) : Promise.resolve({ data: [], error: null } as any),
        supabase.from('reviews').select('rating').eq('client_id', userId)
      ])

      const services = (servicesResponse as any).data || []
      const providers = (providersResponse as any).data || []
      const reviews = (reviewsResponse as any).data || []

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
          provider_name: provider?.full_name || 'Unknown Provider',
          provider_company: provider?.company_name || provider?.full_name || 'Unknown Company',
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
    } catch (error) {
      logger.error('Error fetching client data:', error)
      setStats(defaultStats())
      setRecentBookings([])
      setUpcomingBookings([])
    }
  }

  const fetchServiceSuggestions = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) return

      const response = await fetch('/api/service-suggestions?type=received&status=pending&limit=5', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

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

  if (loading) {
    return (
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                <div className="absolute inset-0 rounded-full border-2 border-blue-200"></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900">Loading Dashboard</p>
                <p className="text-sm text-gray-600">Preparing your client insights...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error || !stats) {
    return (
      <main className="p-6">
        <div className="max-w-3xl mx-auto">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
                <p className="text-gray-600 mb-6 max-w-md">{error || 'Failed to load dashboard data'}</p>
                <Button onClick={checkUserAndFetchData} variant="outline" className="bg-white hover:bg-gray-50">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
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

          {/* Welcome Section (no duplicate KPI tiles) */}
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
                      <div className="text-center p-4 bg-white/70 rounded-2xl border border-white/40 shadow">
                        <div className="text-xl font-semibold text-blue-600">{stats?.totalSpent ? formatCurrency(stats.totalSpent) : 'OMR 0'}</div>
                        <div className="text-sm text-gray-700">Total Spent</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-2xl border border-white/40 shadow">
                        <div className="text-xl font-semibold text-green-600">{stats?.activeBookings || 0}</div>
                        <div className="text-sm text-gray-700">Active</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-2xl border border-white/40 shadow">
                        <div className="text-xl font-semibold text-purple-600">{stats?.completedBookings || 0}</div>
                        <div className="text-sm text-gray-700">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-2xl border border-white/40 shadow">
                        <div className="text-xl font-semibold text-orange-600">{stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}</div>
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

          {/* KPI Grid */}
          <section className="mb-8 sm:mb-10">
            <EnhancedClientKPIGrid data={stats} />
          </section>

          {/* Performance Metrics */}
          <section className="mb-8 sm:mb-10">
            <EnhancedClientPerformanceMetrics data={stats} />
          </section>

          {/* Spending Chart */}
          <section className="mb-8 sm:mb-10">
            <AdvancedClientSpendingChart data={stats} />
          </section>

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
                    <Button onClick={() => router.push('/services')} className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                      <div className="text-center">
                        <div className="text-base font-semibold">Browse Services</div>
                        <div className="text-xs opacity-90">Find what you need</div>
                      </div>
                    </Button>
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