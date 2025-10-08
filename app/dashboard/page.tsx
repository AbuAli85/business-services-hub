'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/dashboard-data'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ActivityFeed, type ActivityItem } from '@/components/dashboard/ActivityFeed'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  Plus,
  Activity,
  DollarSign,
  Package,
  Clock,
  Star,
  BarChart3,
  RefreshCw
} from 'lucide-react'
import UnifiedSearch, { useDebouncedValue } from '@/components/ui/unified-search'
import { useRefreshCallback } from '@/contexts/AutoRefreshContext'
import { LiveModeToggle } from '@/components/dashboard/LiveModeToggle'

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  
  const lastUrlParams = useRef<string>('')
  
  // Only load dashboard data for admin role - others should be redirected
  const { metrics, bookings, invoices, users, services, milestoneEvents, systemEvents, loading: dataLoading, error: dataError, refresh } = useDashboardData(userRole === 'admin' ? userRole : undefined, user?.id)
  // Activity filters
  const [activityType, setActivityType] = useState<'all' | 'bookings' | 'payments' | 'milestones' | 'system'>('all')
  const [activityStatus, setActivityStatus] = useState<'all' | 'completed' | 'pending' | 'failed'>('all')
  const [activityDateRange, setActivityDateRange] = useState<'today' | 'week' | 'month'>('month')
  const [activityQuery, setActivityQuery] = useState('')
  const activityQ = useDebouncedValue(activityQuery, 250)
  const searchParams = useSearchParams()

  // Run auth check once on mount with mounted guard
  useEffect(() => {
    // Only run on exact /dashboard path, not sub-paths like /dashboard/services or provider/client pages
    if (pathname !== '/dashboard') return
    
    // Safety timeout to prevent infinite loading (10 seconds)
    const safetyTimeout = setTimeout(() => {
      setLoading(false)
    }, 10000)
    
    // Check sessionStorage to prevent re-runs across component instances
    if (typeof window !== 'undefined' && sessionStorage.getItem('main-dashboard-auth-checked') === 'true') {
      // Keep loading=true while fetching user
      let isMounted = true
      
      // Still need to get user and check role for potential redirect
      const loadUserAndCheckRole = async () => {
        try {
          const supabase = await getSupabaseClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user && isMounted) {
            setUser(user)
            
            // Determine role
            let role = user.user_metadata?.role
            if (!role) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()
              role = profile?.role || 'client'
            }
            
            setUserRole(role)
            
            
            // Still need to check if redirect is needed even if auth was checked
            if (['provider', 'client'].includes(role)) {
              const redirectUrl = `/dashboard/${role}`
              
              // Clear loading state before redirect
              if (isMounted) setLoading(false)
              
              window.location.href = redirectUrl
              return
            }
            
            // Admin stays on main dashboard
            if (isMounted) setLoading(false)
          }
        } catch (error) {
          console.error('Error loading user:', error)
        } finally {
          if (isMounted) setLoading(false)
        }
      }
      loadUserAndCheckRole()
      
      return () => {
        isMounted = false
        clearTimeout(safetyTimeout)
      }
    }
    
    let isMounted = true
    const controller = new AbortController()

    const init = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        // Add timeout safety (5s for auth)
        const authTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        
        const { data: { session } } = (await Promise.race([
          supabase.auth.getSession(),
          authTimeout
        ])) as any

        if (!isMounted) return

        if (!session?.user) {
          if (isMounted) router.replace('/auth/sign-in')
          return
        }

        const user = session.user
        if (isMounted) setUser(user)

        // Determine role
        let role = user.user_metadata?.role
        if (!role) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          role = profile?.role || 'client'
        }

        if (!isMounted) return
        
        setUserRole(role)

      // Mark auth as checked BEFORE any redirect (but clear it if user needs to be redirected)
      if (!['provider', 'client'].includes(role)) {
        sessionStorage.setItem('main-dashboard-auth-checked', 'true')
      } else {
        // Clear the flag if user needs to be redirected to prevent getting stuck
        sessionStorage.removeItem('main-dashboard-auth-checked')
      }

      // Handle redirect logic cleanly
      if (['provider', 'client'].includes(role)) {
        if (isMounted) {
          setLoading(false) // Clear loading state before redirect
          setRedirecting(true)
          // Use window.location.href for immediate redirect to prevent any race conditions
          const redirectUrl = `/dashboard/${role}`
          window.location.href = redirectUrl
        }
        return
      }
      
      // Admin stays on this page
      if (isMounted) {
        setLoading(false)
      }
      } catch (err) {
        if (!isMounted) return
        console.error('❌ Auth check failed:', err)
        setError('Failed to load user data')
        setLoading(false)
      } finally {
        if (isMounted) setLoading(false)
        controller.abort()
      }
    }

    init()

    return () => {
      isMounted = false
      controller.abort()
      clearTimeout(safetyTimeout)
    }
  }, [pathname])

  // Register with centralized auto-refresh system
  // Note: Only depends on refresh function, not user state
  // This prevents re-registration loops when user state updates
  // Temporarily disabled to prevent constant reloads
  // useRefreshCallback(() => {
  //   if (user?.id) {
  //     refresh()
  //   }
  // }, [refresh])

  // Hydrate filters from URL once
  useEffect(() => {
    const t = searchParams.get('atype') as any
    const s = searchParams.get('astatus') as any
    const d = searchParams.get('adate') as any
    const q = searchParams.get('q') as any
    if (t) setActivityType(t)
    if (s) setActivityStatus(s)
    if (d) setActivityDateRange(d)
    if (q) setActivityQuery(q)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist filters to URL (only if still on this page)
  useEffect(() => {
    if (redirecting || pathname !== '/dashboard') return
    
    const params = new URLSearchParams(window.location.search)
    params.set('atype', activityType)
    params.set('astatus', activityStatus)
    params.set('adate', activityDateRange)
    if (activityQ) params.set('q', activityQ); else params.delete('q')
    
    const newUrlParams = params.toString()
    
    // Only update URL if it actually changed
    if (newUrlParams !== lastUrlParams.current) {
      lastUrlParams.current = newUrlParams
      router.replace(`?${newUrlParams}`, { scroll: false })
    }
  }, [activityType, activityStatus, activityDateRange, activityQ, router, pathname, redirecting])


  // Calculate derived metrics
  const activeBookings = bookings.filter(booking => 
    booking.status === 'in_progress' || booking.status === 'confirmed'
  ).length

  const completedBookings = bookings.filter(booking => 
    booking.status === 'completed'
  ).length

  const totalRevenue = invoices
    .filter((invoice: any) => invoice.status === 'paid')
    .reduce((sum: number, invoice: any) => sum + (invoice.amount || invoice.totalAmount || 0), 0)

  // Revenue trend (last 30 days vs previous 30)
  const nowTs = Date.now()
  const dayMs = 1000 * 60 * 60 * 24
  const last30Start = nowTs - 30 * dayMs
  const prev30Start = nowTs - 60 * dayMs
  const revLast30 = invoices
    .filter((inv: any) => inv.status === 'paid')
    .filter((inv: any) => {
      const ts = new Date(inv.paidAt || inv.updatedAt || inv.createdAt || inv.date || nowTs).getTime()
      return ts >= last30Start && ts <= nowTs
    })
    .reduce((s: number, inv: any) => s + (inv.amount || inv.totalAmount || 0), 0)
  const revPrev30 = invoices
    .filter((inv: any) => inv.status === 'paid')
    .filter((inv: any) => {
      const ts = new Date(inv.paidAt || inv.updatedAt || inv.createdAt || inv.date || nowTs).getTime()
      return ts >= prev30Start && ts < last30Start
    })
    .reduce((s: number, inv: any) => s + (inv.amount || inv.totalAmount || 0), 0)
  const revenueTrendPct = revPrev30 > 0 ? ((revLast30 - revPrev30) / revPrev30) * 100 : (revLast30 > 0 ? 100 : 0)

  const recentActivity = bookings
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
    .map(booking => ({
      id: booking.id,
      type: 'booking' as const,
      description: `${booking.serviceTitle} - ${booking.clientName}`,
      timestamp: booking.updatedAt,
      status: booking.status
    }))

  // Merge in payments (paid invoices)
  const paymentActivity = invoices
    .filter((inv: any) => inv.status === 'paid')
    .sort((a: any, b: any) => new Date(b.paidAt || b.updatedAt || b.createdAt || b.date || 0).getTime() - new Date(a.paidAt || a.updatedAt || a.createdAt || a.date || 0).getTime())
    .slice(0, 5)
    .map((inv: any) => ({
      id: `inv-${inv.id}`,
      type: 'payment' as const,
      description: `Payment received: ${formatCurrency(inv.amount || inv.totalAmount || 0)} from ${inv.clientName || 'Client'}`,
      timestamp: inv.paidAt || inv.updatedAt || inv.createdAt || inv.date,
      status: 'completed'
    }))

  // Milestone approvals/completions
  // Using bookings to infer milestone-related events requires API; here we demonstrate structure with available data
  // If you load milestones into useDashboardData, map them similarly below
  const milestoneActivity: Array<{ id: string; type: string; description: string; timestamp: any; status: string }> = []

  // System notifications (if available via a hook/service)
  // For now, we skip server fetch here to avoid blocking build; can be wired to notificationService
  const systemActivity: Array<{ id: string; type: string; description: string; timestamp: any; status: string }> = []

  const unifiedActivity: ActivityItem[] = [
    ...recentActivity,
    ...paymentActivity,
    // map milestone events
    ...milestoneEvents.map((e: any) => ({
      id: `ms-${e.id}`,
      type: 'milestones' as const,
      description: `${e.type === 'milestone_approved' ? 'Milestone approved' : 'Milestone completed'}: ${e.milestoneTitle}`,
      timestamp: e.createdAt,
      status: e.status
    })),
    // map system notifications
    ...systemEvents.map((s: any) => ({
      id: `sys-${s.id}`,
      type: 'system' as const,
      description: `${s.title} - ${s.message}`,
      timestamp: s.createdAt,
      status: 'info'
    }))
  ]
    .sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime())

  const upcomingBookings = bookings
    .filter(booking => booking.status === 'confirmed' || booking.status === 'in_progress')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(0, 5)
    .map(booking => ({
      id: booking.id,
      serviceName: booking.serviceTitle,
      clientName: booking.clientName,
      date: new Date(booking.createdAt).toLocaleDateString(),
      time: new Date(booking.createdAt).toLocaleTimeString(),
      status: booking.status
    }))

  const performanceMetrics = {
    monthlyGrowth: metrics?.revenueGrowth || 0,
    completionRate: bookings.length > 0 ? (completedBookings / bookings.length) * 100 : 0,
    averageRating: services.length > 0 ? 
      services.reduce((sum, service) => sum + (service.rating || 0), 0) / services.length : 0,
    responseTime: 2.5 // Average response time in hours
  }

  // Activity timeline filtering (demo uses bookings-derived recentActivity)
  const filteredActivity = unifiedActivity.filter(a => {
    // type filter (demo: all as bookings)
    const typeOk = activityType === 'all' || a.type === activityType.slice(0, -1)
    // status filter
    const statusOk = activityStatus === 'all' || a.status === activityStatus
    // date range filter
    const ts = new Date(a.timestamp)
    const now = new Date()
    let dateOk = true
    if (activityDateRange === 'today') {
      dateOk = ts.toDateString() === now.toDateString()
    } else if (activityDateRange === 'week') {
      const diff = (now.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24)
      dateOk = diff <= 7
    } else {
      const diff = (now.getTime() - ts.getTime()) / (1000 * 60 * 60 * 24)
      dateOk = diff <= 31
    }
    // search
    const q = activityQ?.toLowerCase() || ''
    const searchOk = !q || (a.description?.toLowerCase() || '').includes(q)
    return typeOk && statusOk && dateOk && searchOk
  })


  // Show redirecting state
  if (redirecting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Loading dashboard...</p>
          <p className="text-xs text-gray-500 mt-2">
            User: {user?.email || 'Unknown'} | Role: {userRole || 'Loading...'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            If this takes too long, try refreshing the page
          </p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || dataError) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600">
        <div className="text-center">
          <p className="mb-4">{error || dataError}</p>
          <Button
            onClick={() => location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Show dashboard even if some data is missing - provide fallback data
  const safeMetrics = metrics || {
    totalUsers: 0,
    totalServices: 0,
    totalBookings: 0,
    totalRevenue: 0,
    totalInvoices: 0,
    userGrowth: 0,
    revenueGrowth: 0,
    bookingGrowth: 0,
    serviceGrowth: 0,
    lastUpdated: new Date()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Quick Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold mb-1">Welcome back, {(user.user_metadata?.full_name || user.email || 'User').toString().split(' ')[0]}!</h1>
              <p className="text-blue-100 text-lg">Here's your business overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              <p className="text-blue-200 text-sm mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <LiveModeToggle 
                className="text-white"
                variant="outline"
              />
              <Button className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => router.push('/dashboard/bookings/create')}>
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </Button>
              <Button 
                variant="secondary"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={refresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="secondary"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => router.push('/dashboard/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ErrorBoundary pageName="Main Dashboard">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* KPI Cards with trends */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Project Completion"
            value={`${Math.round(performanceMetrics.completionRate)}%`}
            trendPercent={safeMetrics.bookingGrowth || 0}
            trendLabel="this month"
            icon={<Calendar className="h-8 w-8" />}
            accent="blue"
            progressValue={performanceMetrics.completionRate}
          />
          <MetricCard
            title="Client Satisfaction"
            value={`${performanceMetrics.averageRating.toFixed(1)} / 5`}
            icon={<Star className="h-8 w-8 text-yellow-300" />}
            accent="purple"
          />
          <MetricCard
            title="Revenue"
            value={formatCurrency(totalRevenue)}
            trendPercent={safeMetrics.revenueGrowth || 0}
            trendLabel="this month"
            icon={<DollarSign className="h-8 w-8" />}
            accent="green"
          />
          <MetricCard
            title="Active Projects"
            value={activeBookings}
            icon={<Package className="h-8 w-8" />}
            accent="orange"
            progressValue={performanceMetrics.completionRate}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <ActivityFeed items={filteredActivity} onViewAll={() => router.push('/dashboard/activity')} />

              {/* Upcoming Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Bookings
                  </CardTitle>
                  <CardDescription>Next scheduled appointments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingBookings.length > 0 ? (
                      upcomingBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{booking.serviceName}</p>
                            <p className="text-xs text-gray-500">{booking.clientName}</p>
                            <p className="text-xs text-gray-400">{booking.date} at {booking.time}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {booking.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No upcoming bookings</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Manage and track all bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.length > 0 ? (
                    bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{booking.serviceTitle}</p>
                            <p className="text-sm text-gray-500">{booking.clientName} → {booking.providerName}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(booking.totalAmount, booking.currency)}</p>
                          <Badge variant="outline" className="text-xs">
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No bookings found</p>
                      <p className="text-sm text-gray-400">Bookings will appear here when created</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Completion Rate</span>
                      <span>{performanceMetrics.completionRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={performanceMetrics.completionRate} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Average Rating</span>
                      <span>{performanceMetrics.averageRating.toFixed(1)}/5</span>
                    </div>
                    <Progress value={(performanceMetrics.averageRating / 5) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Response Time</span>
                      <span>{performanceMetrics.responseTime}h</span>
                    </div>
                    <Progress value={100 - (performanceMetrics.responseTime / 24) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Revenue</span>
                      <span className="font-medium">{formatCurrency(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Paid Invoices</span>
                      <span className="font-medium">
                        {invoices.filter(inv => inv.status === 'paid').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pending Invoices</span>
                      <span className="font-medium">
                        {invoices.filter(inv => inv.status === 'sent').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Growth Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">User Growth</span>
                      <span className="font-medium text-green-600">
                        +{safeMetrics.userGrowth.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revenue Growth</span>
                      <span className="font-medium text-green-600">
                        +{safeMetrics.revenueGrowth.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Booking Growth</span>
                      <span className="font-medium text-green-600">
                        +{safeMetrics.bookingGrowth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>Real-time system events and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No activity to display</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </ErrorBoundary>
    </div>
  )
}