'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CollapsibleSidebar } from '@/components/dashboard/collapsible-sidebar'
import { Topbar } from '@/components/dashboard/topbar'
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
  Search,
  Plus,
  MessageSquare,
  Target,
  Zap,
  Calendar,
  Star,
  TrendingUp
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  // Dashboard data
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([])
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([])

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return

    let currentUserId: string | null = null
    let subscriptionKeys: string[] = []

    ;(async () => {
      try {
        currentUserId = user.id

        // Subscribe to real-time booking updates
        const bookingSubscription = await realtimeManager.subscribeToBookings(user.id, (update) => {
          if (update.eventType === 'INSERT') {
            fetchRecentBookings(user.id)
            fetchUpcomingBookings(user.id)
            fetchClientStats(user.id)
          } else if (update.eventType === 'UPDATE') {
            fetchRecentBookings(user.id)
            fetchUpcomingBookings(user.id)
            fetchClientStats(user.id)
          }
        })
        subscriptionKeys.push(`bookings:${user.id}`)

        // Subscribe to real-time service suggestions
        const suggestionsSubscription = await realtimeManager.subscribeToServiceSuggestions(user.id, (update) => {
          if (update.eventType === 'INSERT') {
            fetchServiceSuggestions(user.id)
          } else if (update.eventType === 'UPDATE') {
            fetchServiceSuggestions(user.id)
          }
        })
        subscriptionKeys.push(`suggestions:${user.id}`)

        // Subscribe to real-time message updates
        const messageSubscription = await realtimeManager.subscribeToMessages(user.id, (update) => {
          if (update.eventType === 'INSERT') {
            // New message - refresh data if needed
          }
        })
        subscriptionKeys.push(`messages:${user.id}`)

        // Subscribe to general service updates
        const serviceSubscription = await realtimeManager.subscribeToServices('', (update) => {
          if (update.eventType === 'INSERT' || update.eventType === 'UPDATE') {
            // Service updated - refresh favorites
          }
        })
        subscriptionKeys.push('services:')

      } catch (error) {
        console.error('Error setting up realtime subscriptions:', error)
      }
    })()

    return () => {
      if (currentUserId) {
        subscriptionKeys.forEach(key => {
          realtimeManager.unsubscribe(key)
        })
      }
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
      console.log('User role:', userRole)
      console.log('User ID:', user.id)
      console.log('User metadata:', user.user_metadata)
      
      if (userRole !== 'client') {
        console.log('User is not a client, redirecting to dashboard')
        router.push('/dashboard')
        return
      }

      setUser(user)
      
      // Fetch user profile for name display
      await fetchUserProfile(user.id)
      
      // Fetch data with error handling
      try {
        await Promise.all([
          fetchClientStats(user.id),
          fetchRecentBookings(user.id),
          fetchUpcomingBookings(user.id),
          fetchServiceSuggestions(user.id)
        ])
      } catch (fetchError) {
        console.error('Error fetching user data:', fetchError)
      }
    } catch (error) {
      console.error('Error loading client data:', error)
      setError('Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchClientStats = async (userId: string) => {
    try {
      console.log('Fetching client stats for user:', userId)
      const supabase = await getSupabaseClient()
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, amount, currency, created_at')
        .eq('client_id', userId)

      console.log('Client stats query result:', { bookings, error: bookingsError })

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        setStats({
          totalBookings: 0,
          activeBookings: 0,
          completedBookings: 0,
          totalSpent: 0,
          monthlySpent: 0,
          averageRating: 0,
          totalReviews: 0,
          favoriteProviders: 0
        })
        return
      }

      const totalBookings = bookings?.length || 0
      const activeBookings = bookings?.filter(b => ['paid', 'in_progress'].includes(b.status)).length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      
      const totalSpent = bookings
        ?.filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b) => {
          const subtotal = b.amount || 0
          const vatAmount = subtotal * 0.05
          return sum + subtotal + vatAmount
        }, 0) || 0

      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyBookings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear &&
               ['completed', 'in_progress'].includes(b.status)
      }) || []
      
      const monthlySpent = monthlyBookings.reduce((sum, b) => {
        const subtotal = b.amount || 0
        const vatAmount = subtotal * 0.05
        return sum + subtotal + vatAmount
      }, 0)

      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('client_id', userId)

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError)
      }

      const totalReviews = reviews?.length || 0
      const averageRating = totalReviews > 0 && reviews
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0

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
    } catch (error) {
      console.error('Error fetching client stats:', error)
      setStats({
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        totalSpent: 0,
        monthlySpent: 0,
        averageRating: 0,
        totalReviews: 0,
        favoriteProviders: 0
      })
    }
  }

  const fetchRecentBookings = async (userId: string) => {
    try {
      console.log('Fetching recent bookings for user:', userId)
      const supabase = await getSupabaseClient()
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          provider_id,
          status,
          subtotal,
          currency,
          created_at,
          start_time,
          scheduled_date,
          total_amount
        `)
        .or(`client_id.eq.${userId},user_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(5)

      console.log('Bookings query result:', { bookings, error: bookingsError })

      if (bookingsError) {
        console.error('Error fetching recent bookings:', bookingsError)
        setRecentBookings([])
        return
      }

      if (!bookings || bookings.length === 0) {
        setRecentBookings([])
        return
      }

      const serviceIds = Array.from(new Set(bookings.map((b: any) => b.service_id).filter(Boolean)))
      const providerIds = Array.from(new Set(bookings.map((b: any) => b.provider_id).filter(Boolean)))
      
      if (serviceIds.length > 0 && providerIds.length > 0) {
        const [servicesResponse, providersResponse] = await Promise.all([
          supabase
            .from('services')
            .select('id, title')
            .in('id', serviceIds),
          supabase
            .from('profiles')
            .select('id, full_name, company_name')
            .in('id', providerIds)
        ])

        const enrichedBookings = bookings.map((b: any) => {
          const service = servicesResponse.data?.find(s => s.id === b.service_id)
          const provider = providersResponse.data?.find(p => p.id === b.provider_id)
          return {
            ...b,
            service_title: service?.title || 'Unknown Service',
            provider_name: provider?.full_name || 'Unknown Provider',
            provider_company: provider?.company_name || 'Unknown Company',
            amount: b.total_amount || (b.subtotal ? b.subtotal + (b.subtotal * 0.05) : 0),
            scheduled_date: b.scheduled_date || b.start_time || b.created_at
          }
        })

        setRecentBookings(enrichedBookings)
      } else {
        const enrichedBookings = bookings.map((b: any) => ({
          ...b,
          service_title: 'Unknown Service',
          provider_name: 'Unknown Provider',
          provider_company: 'Unknown Company',
          amount: b.total_amount || (b.subtotal ? b.subtotal + (b.subtotal * 0.05) : 0),
          scheduled_date: b.scheduled_date || b.start_time || b.created_at
        }))
        setRecentBookings(enrichedBookings)
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
      setRecentBookings([])
    }
  }

  const fetchUpcomingBookings = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          provider_id,
          status,
          created_at,
          start_time,
          scheduled_date
        `)
        .eq('client_id', userId)
        .in('status', ['paid', 'in_progress'])
        .order('created_at', { ascending: true })
        .limit(3)

      if (bookingsError) {
        console.error('Error fetching upcoming bookings:', bookingsError)
        setUpcomingBookings([])
        return
      }

      if (!bookings || bookings.length === 0) {
        setUpcomingBookings([])
        return
      }

      const serviceIds = Array.from(new Set(bookings.map((b: any) => b.service_id).filter(Boolean)))
      const providerIds = Array.from(new Set(bookings.map((b: any) => b.provider_id).filter(Boolean)))
      
      if (serviceIds.length > 0 && providerIds.length > 0) {
        const [servicesResponse, providersResponse] = await Promise.all([
          supabase
            .from('services')
            .select('id, title')
            .in('id', serviceIds),
          supabase
            .from('profiles')
            .select('id, full_name, company_name')
            .in('id', providerIds)
        ])

        const enrichedBookings = bookings.map((b: any) => {
          const service = servicesResponse.data?.find(s => s.id === b.service_id)
          const provider = providersResponse.data?.find(p => p.id === b.provider_id)
          return {
            ...b,
            service_title: service?.title || 'Unknown Service',
            provider_name: provider?.full_name || 'Unknown Provider',
            provider_company: provider?.company_name || 'Unknown Company',
            scheduled_date: b.scheduled_date || b.start_time || b.created_at,
            scheduled_time: b.start_time ? new Date(b.start_time).toLocaleTimeString() : 'TBD',
            location: 'TBD'
          }
        })

        setUpcomingBookings(enrichedBookings)
      } else {
        const enrichedBookings = bookings.map((b: any) => ({
          ...b,
          service_title: 'Unknown Service',
          provider_name: 'Unknown Provider',
          provider_company: 'Unknown Company',
          scheduled_date: b.scheduled_date || b.start_time || b.created_at,
          scheduled_time: b.start_time ? new Date(b.start_time).toLocaleTimeString() : 'TBD',
          location: 'TBD'
        }))
        setUpcomingBookings(enrichedBookings)
      }
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error)
      setUpcomingBookings([])
    }
  }

  const fetchUserProfile = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return
      }

      setUserProfile(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchServiceSuggestions = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No access token available')
        return
      }

      const response = await fetch('/api/service-suggestions?type=received&status=pending&limit=5', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch service suggestions:', response.statusText)
        return
      }

      const data = await response.json()
      setServiceSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Error fetching service suggestions:', error)
      setServiceSuggestions([])
    }
  }

  const handleRefresh = async () => {
    if (!user?.id) return
    
    try {
      setRefreshing(true)
      await Promise.all([
        fetchClientStats(user.id),
        fetchRecentBookings(user.id),
        fetchUpcomingBookings(user.id),
        fetchServiceSuggestions(user.id)
      ])
      toast.success('Dashboard refreshed')
    } catch (err) {
      console.error('Error refreshing dashboard:', err)
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <CollapsibleSidebar 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed} 
        />
        
        <div className="flex flex-col flex-1">
          <Topbar 
            title="Client Dashboard" 
            subtitle="Loading your dashboard..." 
          />
          
          <main className="flex-1 overflow-y-auto p-6">
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
          </main>
        </div>
      </div>
    )
  }

  if (error || !stats) {
  return (
      <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <CollapsibleSidebar 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed} 
        />
        
        <div className="flex flex-col flex-1">
          <Topbar 
            title="Client Dashboard" 
            subtitle="Error loading dashboard" 
          />
          
          <main className="flex-1 overflow-y-auto p-6">
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
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <CollapsibleSidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1">
        {/* Topbar */}
        <Topbar 
          title="Client Dashboard" 
          subtitle={`Welcome back${userProfile?.full_name ? `, ${userProfile.full_name}` : ''}! Here's your booking overview`}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          {/* Welcome Section with Enhanced Design */}
          <div className="mb-8 sm:mb-10">
            <div className="relative">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-3xl -m-4 sm:-m-6 lg:-m-8"></div>
              <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl border border-white/20 shadow-xl p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          Your Service Hub
                        </h1>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base lg:text-lg">Discover, book, and manage your professional services</p>
                      </div>
                    </div>
                    
                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                      <div className="text-center p-3 bg-white/60 rounded-xl border border-white/30">
                        <div className="text-lg sm:text-xl font-bold text-blue-600">{stats?.totalSpent ? formatCurrency(stats.totalSpent) : 'OMR 0'}</div>
                        <div className="text-xs text-gray-600">Total Spent</div>
                      </div>
                      <div className="text-center p-3 bg-white/60 rounded-xl border border-white/30">
                        <div className="text-lg sm:text-xl font-bold text-green-600">{stats?.activeBookings || 0}</div>
                        <div className="text-xs text-gray-600">Active Bookings</div>
                      </div>
                      <div className="text-center p-3 bg-white/60 rounded-xl border border-white/30">
                        <div className="text-lg sm:text-xl font-bold text-purple-600">{stats?.completedBookings || 0}</div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div className="text-center p-3 bg-white/60 rounded-xl border border-white/30">
                        <div className="text-lg sm:text-xl font-bold text-orange-600">{stats?.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}</div>
                        <div className="text-xs text-gray-600">Avg Rating</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 lg:space-y-3 lg:space-x-0 xl:space-y-0 xl:space-x-3">
                    <div className="flex items-center space-x-2 px-4 py-2 bg-green-100/80 backdrop-blur-sm rounded-full border border-green-200/50">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Live Dashboard</span>
                    </div>
                    <Button 
                      onClick={handleRefresh} 
                      disabled={refreshing}
                      variant="outline"
                      size="sm"
                      className="bg-white/80 backdrop-blur-sm border-white/40 hover:bg-white/90 text-sm shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
              
          {/* KPI Grid */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-slate-50/30 to-gray-50/30 rounded-2xl -m-2"></div>
              <div className="relative">
                <EnhancedClientKPIGrid data={stats} />
              </div>
            </div>
          </section>

          {/* Performance Metrics */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-indigo-50/30 rounded-2xl -m-2"></div>
              <div className="relative">
                <EnhancedClientPerformanceMetrics data={stats} />
              </div>
            </div>
          </section>

          {/* Spending Chart */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-50/30 to-emerald-50/30 rounded-2xl -m-2"></div>
              <div className="relative">
                <AdvancedClientSpendingChart data={stats} />
              </div>
            </div>
          </section>

          {/* Bookings + Service Suggestions */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-10 mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50/30 to-pink-50/30 rounded-2xl -m-2"></div>
              <div className="relative">
                <PremiumClientBookings 
                  recentBookings={recentBookings} 
                  upcomingBookings={upcomingBookings} 
                />
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-50/30 to-amber-50/30 rounded-2xl -m-2"></div>
              <div className="relative">
                <EliteServiceSuggestions suggestions={serviceSuggestions} />
              </div>
            </div>
          </section>

          {/* Quick Actions & Insights */}
          <section className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-slate-50/30 rounded-2xl -m-2"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6 sm:p-8">
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
                      <Button 
                        onClick={() => router.push('/services')}
                        className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <div className="text-center">
                          <div className="text-base font-semibold">Browse Services</div>
                          <div className="text-xs opacity-90">Find what you need</div>
                        </div>
                      </Button>
                      <Button 
                        onClick={() => router.push('/dashboard/bookings/create')}
                        className="h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <div className="text-center">
                          <div className="text-base font-semibold">Book Service</div>
                          <div className="text-xs opacity-90">Start new project</div>
                        </div>
                      </Button>
                      <Button 
                        onClick={() => router.push('/dashboard/messages')}
                        className="h-16 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <div className="text-center">
                          <div className="text-base font-semibold">Messages</div>
                          <div className="text-xs opacity-90">Contact providers</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 lg:space-y-4 lg:space-x-0 xl:space-y-0 xl:space-x-4">
                    <div className="text-center lg:text-left">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                        {stats?.totalBookings || 0}
                      </div>
                      <div className="text-sm text-gray-600">Total Bookings</div>
                    </div>
                    <div className="text-center lg:text-left">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                        {stats?.totalReviews || 0}
                      </div>
                      <div className="text-sm text-gray-600">Reviews Given</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}