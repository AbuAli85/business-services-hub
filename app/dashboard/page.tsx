'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react'

interface DashboardStats {
  totalBookings: number
  activeBookings: number
  completedBookings: number
  totalEarnings: number
  pendingPayments: number
}

interface RecentBooking {
  id: string
  status: string
  subtotal: number
  currency: string
  created_at: string
  service: {
    title: string
  }
  client?: {
    full_name: string
  }
  provider?: {
    full_name: string
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalEarnings: 0,
    pendingPayments: 0,
  })
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found in dashboard')
        return
      }

      console.log('User found in dashboard:', user)

      // Get user role from metadata instead of database
      const userRole = user.user_metadata?.role || 'client'
      setUserRole(userRole)
      console.log('User role from metadata:', userRole)

      // Fetch real data for providers
      if (userRole === 'provider') {
        await fetchProviderStats(user.id)
        await fetchRecentBookings(user.id)
      }

      console.log('Dashboard data loaded successfully')
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  const fetchProviderStats = async (userId: string) => {
    try {
      // Try to fetch data with provider_id first (migration 001 structure)
      let totalBookings = 0
      let activeBookings = 0
      let completedBookings = 0
      let pendingPayments = 0
      let totalEarnings = 0

      try {
        // Try provider_id structure first
        const { count: totalBookingsResult } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', userId)

        if (totalBookingsResult !== null) {
          totalBookings = totalBookingsResult
        }

        const { count: activeBookingsResult } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', userId)
          .in('status', ['in_progress', 'delivered'])

        if (activeBookingsResult !== null) {
          activeBookings = activeBookingsResult
        }

        const { count: completedBookingsResult } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', userId)
          .eq('status', 'completed')

        if (completedBookingsResult !== null) {
          completedBookings = completedBookingsResult
        }

        const { count: pendingPaymentsResult } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', userId)
          .eq('status', 'pending_payment')

        if (pendingPaymentsResult !== null) {
          pendingPayments = pendingPaymentsResult
        }

        // Calculate total earnings from completed bookings
        const { data: completedBookingsData } = await supabase
          .from('bookings')
          .select('subtotal, currency')
          .eq('provider_id', userId)
          .eq('status', 'completed')

        if (completedBookingsData) {
          totalEarnings = completedBookingsData.reduce((sum, booking) => {
            return sum + (booking.subtotal || 0)
          }, 0)
        }

        console.log('Successfully fetched data using provider_id structure')
      } catch (error) {
        console.log('provider_id structure failed, trying user_id structure...')
        
        // Try user_id structure (migration 012 structure)
        try {
          const { count: totalBookingsResult } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

          if (totalBookingsResult !== null) {
            totalBookings = totalBookingsResult
          }

          const { count: activeBookingsResult } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['in_progress', 'delivered'])

          if (activeBookingsResult !== null) {
            activeBookings = activeBookingsResult
          }

          const { count: completedBookingsResult } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'completed')

          if (completedBookingsResult !== null) {
            completedBookings = completedBookingsResult
          }

          const { count: pendingPaymentsResult } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'pending_payment')

          if (pendingPaymentsResult !== null) {
            pendingPayments = pendingPaymentsResult
          }

          // Calculate total earnings from completed bookings
          const { data: completedBookingsData } = await supabase
            .from('bookings')
            .select('total_cost, currency')
            .eq('user_id', userId)
            .eq('status', 'completed')

          if (completedBookingsData) {
            totalEarnings = completedBookingsData.reduce((sum, booking) => {
              return sum + (booking.total_cost || 0)
            }, 0)
          }

          console.log('Successfully fetched data using user_id structure')
        } catch (userError) {
          console.log('Both structures failed, using default values')
          console.error('Error with user_id structure:', userError)
        }
      }

      setStats({
        totalBookings,
        activeBookings,
        completedBookings,
        totalEarnings,
        pendingPayments,
      })
    } catch (error) {
      console.error('Error fetching provider stats:', error)
      // Keep default stats if there's an error
    }
  }

  const fetchRecentBookings = async (userId: string) => {
    try {
      let bookings: RecentBooking[] = []

      try {
        // Try provider_id structure first
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            subtotal,
            currency,
            created_at,
            service:services(title),
            client:profiles!bookings_client_id_fkey(full_name)
          `)
          .eq('provider_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (bookingsData) {
          // Transform the data to match the expected structure
          bookings = bookingsData.map((booking: any) => ({
            id: booking.id,
            status: booking.status,
            subtotal: booking.subtotal || 0,
            currency: booking.currency || 'OMR',
            created_at: booking.created_at,
            service: { title: booking.service?.title || 'Unknown Service' },
            client: { full_name: booking.client?.full_name || 'Unknown Client' }
          }))
          console.log('Successfully fetched recent bookings using provider_id structure')
        }
      } catch (error) {
        console.log('provider_id structure failed for recent bookings, trying user_id structure...')
        
        // Try user_id structure
        try {
          const { data: bookingsData } = await supabase
            .from('bookings')
            .select(`
              id,
              status,
              total_cost,
              currency,
              created_at,
              service:services(title),
              client:profiles!bookings_client_id_fkey(full_name)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5)

          if (bookingsData) {
            // Transform the data to match the expected structure
            bookings = bookingsData.map((booking: any) => ({
              id: booking.id,
              status: booking.status,
              subtotal: booking.total_cost || 0,
              currency: booking.currency || 'OMR',
              created_at: booking.created_at,
              service: { title: booking.service?.title || 'Unknown Service' },
              client: { full_name: booking.client?.full_name || 'Unknown Client' }
            }))
            console.log('Successfully fetched recent bookings using user_id structure')
          }
        } catch (userError) {
          console.log('Both structures failed for recent bookings')
          console.error('Error with user_id structure:', userError)
        }
      }

      if (bookings.length > 0) {
        setRecentBookings(bookings)
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
    }
  }

  const handleCreateService = () => {
    router.push('/dashboard/provider/services/create')
  }

  const handleBrowseServices = () => {
    router.push('/dashboard/services')
  }

  const handleCompleteProfile = () => {
    router.push(`/auth/onboarding?role=${userRole}`)
  }

  const handleViewCalendar = () => {
    router.push('/dashboard/calendar')
  }

  const handleViewReports = () => {
    router.push('/dashboard/reports')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800'
      case 'delivered':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      case 'pending_payment':
        return <AlertCircle className="h-4 w-4" />
      case 'delivered':
        return <Eye className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {userRole === 'provider' ? 'Provider' : userRole === 'admin' ? 'Admin' : userRole === 'client' ? 'Client' : 'User'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your business today.
        </p>
        
        {/* Quick Navigation */}
        <div className="mt-4 flex space-x-4">
          <Button onClick={handleBrowseServices}>
            Browse Services
          </Button>
          <Button variant="outline" onClick={handleCompleteProfile}>
            Complete Profile
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              All time bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              Currently in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === 'provider' ? 'Total Earnings' : 'Total Spent'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalEarnings, 'OMR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'provider' ? 'From completed work' : 'On services'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === 'provider' ? 'Pending Payments' : 'Pending Orders'}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>
            Your latest booking activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No bookings yet. Start by exploring services!</p>
              <Button 
                className="mt-4" 
                onClick={handleBrowseServices}
              >
                Browse Services
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {booking.service?.title}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {userRole === 'client' 
                            ? `Provider: ${booking.provider?.full_name}`
                            : `Client: ${booking.client?.full_name}`
                          }
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(booking.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(booking.subtotal, booking.currency)}
                    </div>
                    <Badge variant="secondary" className={getStatusColor(booking.status)}>
                      {booking.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Get things done faster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userRole === 'provider' && (
              <Button 
                className="h-20 flex-col space-y-2"
                onClick={handleCreateService}
              >
                <Users className="h-6 w-6" />
                <span>Create Service</span>
              </Button>
            )}
            
            {userRole === 'client' && (
              <Button 
                variant="outline" 
                className="h-20 flex-col space-y-2"
                onClick={handleBrowseServices}
              >
                <Eye className="h-6 w-6" />
                <span>Browse Services</span>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2"
              onClick={handleViewCalendar}
            >
              <Calendar className="h-6 w-6" />
              <span>View Calendar</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2"
              onClick={handleViewReports}
            >
              <TrendingUp className="h-6 w-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
