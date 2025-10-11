'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RefreshCw, 
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Star,
  Users,
  Activity,
  Target,
  Award,
  BarChart3,
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase'
import { ProviderDashboardService, ProviderDashboardStats, RecentBooking, TopService, MonthlyEarnings } from '@/lib/provider-dashboard'
import { logger } from '@/lib/logger'

// Optimized Stats Cards Component
function StatsCards({ stats }: { stats: ProviderDashboardStats | null }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Earnings',
      value: formatCurrency(stats.total_earnings || 0),
      subtitle: 'This month',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Active Bookings',
      value: stats.active_bookings || 0,
      subtitle: 'In progress',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Active Services',
      value: stats.active_services || 0,
      subtitle: 'Available',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Average Rating',
      value: stats.avg_rating ? stats.avg_rating.toFixed(1) : 'N/A',
      subtitle: 'Customer satisfaction',
      icon: Star,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} ${stat.borderColor} border rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Optimized Recent Bookings Component
function RecentBookings({ bookings }: { bookings: RecentBooking[] }) {
  if (!bookings || bookings.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Recent Bookings
          </CardTitle>
          <CardDescription>Your latest service bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recent bookings found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      in_progress: { color: 'bg-blue-100 text-blue-800', text: 'In Progress' },
      completed: { color: 'bg-gray-100 text-gray-800', text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={`${config.color} border-0 text-xs`}>{config.text}</Badge>
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Recent Bookings
        </CardTitle>
        <CardDescription>Your latest service bookings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookings.slice(0, 5).map((booking) => (
            <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900">{booking.service_title || booking.title || 'Untitled Service'}</h4>
                  {getStatusBadge(booking.status)}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {booking.client_name || 'Unknown Client'}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(booking.total_amount || 0)}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Optimized Top Services Component
function TopServices({ services }: { services: TopService[] }) {
  if (!services || services.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Top Services
          </CardTitle>
          <CardDescription>Your best performing services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No services data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-purple-600" />
          Top Services
        </CardTitle>
        <CardDescription>Your best performing services</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.slice(0, 5).map((service, index) => (
            <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{service.title}</h4>
                  <p className="text-sm text-gray-600">Service</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{service.booking_count || 0} bookings</p>
                <p className="text-sm text-green-600">
                  {formatCurrency(service.total_earnings || 0)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Simple Earnings Chart Component
function SimpleEarningsChart({ earnings }: { earnings: MonthlyEarnings[] }) {
  if (!earnings || earnings.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Earnings Overview
          </CardTitle>
          <CardDescription>Monthly earnings trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No earnings data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxEarnings = Math.max(...earnings.map(e => e.earnings || 0))
  const totalEarnings = earnings.reduce((sum, e) => sum + (e.earnings || 0), 0)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-green-600" />
          Earnings Overview
        </CardTitle>
        <CardDescription>Monthly earnings trend</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnings)}</p>
            <p className="text-sm text-gray-600">Total earnings</p>
          </div>
          
          <div className="space-y-3">
            {earnings.slice(0, 6).map((earning) => {
              const percentage = maxEarnings > 0 ? (earning.earnings || 0) / maxEarnings * 100 : 0
              return (
                <div key={earning.month_year} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{earning.month_year}</span>
                      <span className="text-sm text-gray-600">{formatCurrency(earning.earnings || 0)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Optimized Provider Dashboard
export default function ProviderDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Dashboard data
  const [stats, setStats] = useState<ProviderDashboardStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [monthlyEarnings, setMonthlyEarnings] = useState<MonthlyEarnings[]>([])

  // Refs to prevent duplicate initialization
  const initializingRef = useRef(false)
  const cleanupFunctionsRef = useRef<Array<() => void>>([])

  // Auth and data loading
  useEffect(() => {
    if (initializingRef.current) return
    
    initializingRef.current = true
    let isMounted = true

    const init = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (!isMounted) return

        if (userError || !user) {
          console.log('No user found, redirecting to sign-in')
          router.replace('/auth/sign-in')
          return
        }

        // Check role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const userRole = profile?.role || user.user_metadata?.role || 'provider'
        if (!isMounted) return

        if (userRole !== 'provider') {
          console.log(`Redirecting ${userRole} to their dashboard`)
          const dashboardUrl = userRole === 'client' ? '/dashboard/client' : '/dashboard'
            router.replace(dashboardUrl)
          return
        }

        // Set user and load data
        setUserId(user.id)
        await loadDashboardData(user.id)
        
      } catch (error) {
        if (!isMounted) return
        logger.error('❌ Provider dashboard init failed:', error)
        setError('Failed to load dashboard')
        toast.error('Failed to load dashboard')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    init()

    return () => {
      isMounted = false
      cleanupFunctionsRef.current.forEach(cleanup => cleanup())
      cleanupFunctionsRef.current = []
      initializingRef.current = false
    }
  }, [router])

  const loadDashboardData = useCallback(async (providerId: string) => {
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
  }, [])

  const handleRefresh = useCallback(async () => {
    if (!userId || refreshing) return
    
    setRefreshing(true)
    try {
      await loadDashboardData(userId)
      toast.success('Dashboard refreshed')
    } catch (err) {
      logger.error('Error refreshing dashboard:', err)
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }, [userId, refreshing, loadDashboardData])

  // Loading state
  if (loading) {
    return (
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Error state
  if (error || !stats) {
    return (
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Dashboard</h3>
              <p className="text-gray-600 mb-4">{error || 'Failed to load dashboard data'}</p>
              <div className="space-x-2">
                <Button onClick={handleRefresh} variant="outline">Retry</Button>
                <Button onClick={() => window.location.reload()}>Reload Page</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Provider Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your business.</p>
                    </div>
                    
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            <Button 
              onClick={() => router.push('/dashboard/services/new')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Service
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RecentBookings bookings={recentBookings} />
          <TopServices services={topServices} />
            </div>

          {/* Earnings Chart */}
        <SimpleEarningsChart earnings={monthlyEarnings} />

      </div>
    </main>
  )
}