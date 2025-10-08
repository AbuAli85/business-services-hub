'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// Layout-level sidebar and header are provided by app/dashboard/layout.tsx
import { EnhancedKPIGrid, EnhancedPerformanceMetrics } from '@/components/dashboard/enhanced-kpi-cards'
import { AdvancedEarningsChart } from '@/components/dashboard/advanced-earnings-chart'
import { PremiumRecentBookings } from '@/components/dashboard/premium-recent-bookings'
import { EliteTopServices } from '@/components/dashboard/elite-top-services'
import { MonthlyGoals } from '@/components/dashboard/monthly-goals'
import { ProviderDashboardService, ProviderDashboardStats, RecentBooking, TopService, MonthlyEarnings } from '@/lib/provider-dashboard'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  Award,
  Target,
  Zap
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { SessionStatusIndicator } from '@/components/ui/session-status-indicator'
import { ProviderDashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary'
import { logger } from '@/lib/logger'
import { useRefreshCallback } from '@/contexts/AutoRefreshContext'
import { LiveModeToggle } from '@/components/dashboard/LiveModeToggle'
import { usePageStability } from '@/hooks/usePageStability'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useRenderCount } from '@/hooks/useRenderCount'
import { useEffectDebugger } from '@/hooks/useEffectDebugger'
import { DashboardDebugPanel } from '@/components/DashboardDebugPanel'

export default function ProviderDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  
  // Monitor page stability
  const renderCount = usePageStability('ProviderDashboard')
  const debugRenderCount = useRenderCount('ProviderDashboard')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Dashboard data
  const [stats, setStats] = useState<ProviderDashboardStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([])

  // Register with auto-refresh system
  useRefreshCallback(async () => {
    // Debug this callback
    useEffectDebugger('ProviderRefreshCallback', [userId])
    
    if (userId) {
      await loadDashboardData(userId)
    }
  }, [userId])

  // Check auth and load data on mount with mounted guard
  useEffect(() => {
    // Debug this effect
    useEffectDebugger('ProviderAuthCheck', [])
    
    // Check sessionStorage to prevent re-runs across component instances
    if (typeof window !== 'undefined' && sessionStorage.getItem('provider-dashboard-auth-checked') === 'true') {
      console.log('⏭️ Auth already checked, skipping auth but still need to load data')
      // Still need to get user and load data even if auth was checked
      const loadCachedData = async () => {
        try {
          const supabase = await getSupabaseClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setUserId(user.id)
            await loadDashboardData(user.id)
            console.log('✅ Data loaded from cached session')
          }
        } catch (error) {
          logger.error('Error loading cached data:', error)
        } finally {
          setLoading(false)
        }
      }
      loadCachedData()
      return
    }
    
    console.log('🏠 Provider dashboard mounted')
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
          userRole = profile?.role || 'provider'
        }

        if (!isMounted) return

        console.log('✅ User authenticated:', user.email, '| Role:', userRole)

        // Handle redirect logic cleanly
        if (userRole !== 'provider') {
          console.log(`🔄 Redirecting ${userRole} to their dashboard`)
          if (isMounted) {
            setRedirecting(true)
            const dashboardUrl = userRole === 'client' 
              ? '/dashboard/client'
              : '/dashboard'
            // Use window.location.href for immediate redirect to prevent any race conditions
            window.location.href = dashboardUrl
          }
          return
        }

      // Provider user - set user and load data
      console.log('👤 Provider user confirmed, loading data...')
      if (isMounted) {
        setUserId(user.id)
        // Mark auth as checked for this session
        sessionStorage.setItem('provider-dashboard-auth-checked', 'true')
      }

        // Load data with timeout safety (8s for data)
        const dataTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Data timeout')), 8000)
        )

        try {
          await Promise.race([loadDashboardData(user.id), dataTimeout])
          if (isMounted) {
            console.log('✅ Data loaded successfully')
            // Set up real-time subscriptions
            setupRealtimeSubscriptions(user.id).catch(err => 
              console.warn('Failed to setup real-time subscriptions:', err)
            )
          }
        } catch (dataError) {
          if (!isMounted) return
          logger.warn('⚠️ Error fetching provider data:', dataError)
          setStats({
            total_earnings: 0,
            active_bookings: 0,
            active_services: 0,
            avg_rating: 0
          } as any)
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
      console.log('🧹 Provider dashboard cleanup')
      isMounted = false
      controller.abort()
    }
  }, [])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    // Debug this effect
    useEffectDebugger('ProviderCleanup', [userId])
    
    return () => {
      // Cleanup will be handled by the subscription cleanup functions
    }
  }, [userId])

  // Register with centralized auto-refresh system
  // Temporarily disabled to prevent constant reloads
  // useRefreshCallback(() => {
  //   if (userId && !refreshing) {
  //     loadDashboardData(userId)
  //   }
  // }, [userId, refreshing])


  const loadDashboardData = async (providerId: string) => {
    try {
      const data = await ProviderDashboardService.getAllDashboardData(providerId)
      setStats(data.stats)
      setRecentBookings(data.recentBookings)
      setTopServices(data.topServices)
      setMonthlyEarnings(data.monthlyEarnings)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      logger.error('Error loading dashboard data:', err)
      throw err
    }
  }

  const handleRefresh = async () => {
    if (!userId) return
    
    try {
      setRefreshing(true)
      await loadDashboardData(userId)
      toast.success('Dashboard refreshed')
    } catch (err) {
      logger.error('Error refreshing dashboard:', err)
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  // Set up real-time subscriptions for live data updates
  const setupRealtimeSubscriptions = async (providerId: string) => {
    const supabase = await getSupabaseClient()
    
    // Subscribe to booking changes
    const bookingsSubscription = supabase
      .channel('provider-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `provider_id=eq.${providerId}`
        },
        () => {
          console.log('📡 Booking change detected, refreshing data...')
          loadDashboardData(providerId)
        }
      )
      .subscribe()

    // Subscribe to service changes
    const servicesSubscription = supabase
      .channel('provider-services')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services',
          filter: `provider_id=eq.${providerId}`
        },
        () => {
          console.log('📡 Service change detected, refreshing data...')
          loadDashboardData(providerId)
        }
      )
      .subscribe()

    // Subscribe to milestone changes (affects booking progress)
    const milestonesSubscription = supabase
      .channel('provider-milestones')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'milestones'
        },
        (payload: any) => {
          // Only refresh if milestone belongs to provider's booking
          if (payload.new?.booking_id) {
            console.log('📡 Milestone change detected, refreshing data...')
            loadDashboardData(providerId)
          }
        }
      )
      .subscribe()

    // Cleanup function
    return () => {
      supabase.removeChannel(bookingsSubscription)
      supabase.removeChannel(servicesSubscription)
      supabase.removeChannel(milestonesSubscription)
    }
  }

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
    <ProviderDashboardErrorBoundary>
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Provider Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's what's happening with your business.</p>
          </div>
          <div className="flex items-center space-x-3">
            <LiveModeToggle 
              variant="outline"
              size="sm"
            />
            <SessionStatusIndicator showDetails={true} />
            <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
          {/* Welcome Section with Enhanced Design */}
          <div className="mb-10 sm:mb-12">
            <div className="relative">
              {/* Enhanced Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-indigo-50/40 to-purple-50/60 rounded-3xl -m-6 sm:-m-8 lg:-m-10"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-3xl -m-6 sm:-m-8 lg:-m-10"></div>
              <div className="relative bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/30 shadow-2xl p-6 sm:p-8 lg:p-10">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          Business Overview
                        </h1>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base lg:text-lg">Monitor your performance and grow your business</p>
                      </div>
                    </div>
                    
                    {/* Enhanced Quick Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-6 sm:mt-8">
                      <div className="group text-center p-4 sm:p-5 bg-gradient-to-br from-white/70 to-white/50 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1">
                          {stats?.total_earnings ? formatCurrency(stats.total_earnings) : 'OMR 0'}
                        </div>
                        <div className="text-sm font-medium text-gray-700">Total Earnings</div>
                        <div className="w-8 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mx-auto mt-2"></div>
                      </div>
                      <div className="group text-center p-4 sm:p-5 bg-gradient-to-br from-white/70 to-white/50 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="text-xl sm:text-2xl font-bold text-green-600 mb-1">{stats?.active_bookings || 0}</div>
                        <div className="text-sm font-medium text-gray-700">Active Bookings</div>
                        <div className="w-8 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mt-2"></div>
                      </div>
                      <div className="group text-center p-4 sm:p-5 bg-gradient-to-br from-white/70 to-white/50 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="text-xl sm:text-2xl font-bold text-purple-600 mb-1">{stats?.active_services || 0}</div>
                        <div className="text-sm font-medium text-gray-700">Active Services</div>
                        <div className="w-8 h-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full mx-auto mt-2"></div>
                      </div>
                      <div className="group text-center p-4 sm:p-5 bg-gradient-to-br from-white/70 to-white/50 rounded-2xl border border-white/40 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="text-xl sm:text-2xl font-bold text-orange-600 mb-1">{stats?.avg_rating ? stats.avg_rating.toFixed(1) : 'N/A'}</div>
                        <div className="text-sm font-medium text-gray-700">Avg Rating</div>
                        <div className="w-8 h-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full mx-auto mt-2"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 lg:space-y-3 lg:space-x-0 xl:space-y-0 xl:space-x-3">
                    <LiveModeToggle 
                      showLabel={true}
                      variant="outline"
                      size="sm"
                    />
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

          {/* KPI Grid with Quick Actions and Smart Alerts */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/40 via-gray-50/30 to-slate-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <EnhancedKPIGrid 
                  data={stats} 
                  alerts={{
                    unreadMessages: undefined,
                    pendingBookings: recentBookings.filter(b => b.status === 'pending').length,
                    hasServices: (stats.active_services || 0) > 0
                  }}
                />
              </div>
            </div>
          </section>

          {/* Performance Metrics */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-indigo-50/30 to-blue-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <EnhancedPerformanceMetrics 
                  data={stats}
                  breakdown={topServices.map(s => ({
                    service: s.title,
                    completion_rate: s.completion_rate || 0,
                    response_rate: undefined,
                  }))}
                  insights={[
                    ...topServices
                      .filter(s => (s.completion_rate || 0) < 0.7)
                      .slice(0, 2)
                      .map(s => `Low completion rate for ${s.title} – improve delivery timelines.`),
                    ...topServices
                      .filter(s => (s.avg_rating || 0) < 3.5)
                      .slice(0, 1)
                      .map(s => `Satisfaction is below target for ${s.title} – collect feedback and optimize scope.`)
                  ]}
                />
              </div>
            </div>
          </section>

          {/* Earnings Chart */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-emerald-50/30 to-green-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <AdvancedEarningsChart data={monthlyEarnings} />
              </div>
            </div>
          </section>

          {/* Recent Bookings + Top Services */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 sm:gap-10 mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-pink-50/30 to-purple-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <PremiumRecentBookings bookings={recentBookings} />
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-amber-50/30 to-orange-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <EliteTopServices services={topServices} />
              </div>
            </div>
          </section>

          {/* Monthly Goals & Achievements */}
          <section className="mb-10 sm:mb-12">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-indigo-100/40 rounded-3xl -m-4"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
              <div className="relative">
                <MonthlyGoals data={stats} />
              </div>
            </div>
          </section>

          {/* Quick Actions removed (now inside KPI section) */}

      </div>
    </main>
    
    {/* Debug Panel - Only in development */}
    <DashboardDebugPanel 
      componentName="ProviderDashboard"
      renderCount={debugRenderCount}
    />
    </ProviderDashboardErrorBoundary>
  )
}