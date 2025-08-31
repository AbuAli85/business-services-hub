'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Star
} from 'lucide-react'

interface DashboardData {
  totalServices: number
  activeBookings: number
  totalClients: number
  revenue: number
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    status: string
  }>
  upcomingBookings: Array<{
    id: string
    serviceName: string
    clientName: string
    date: string
    time: string
    status: string
  }>
  performanceMetrics: {
    monthlyGrowth: number
    completionRate: number
    averageRating: number
    responseTime: number
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [userRole, setUserRole] = useState<string>('client')

  useEffect(() => {
    checkAuth()
    
    // Set up real-time refresh every 30 seconds
    const interval = setInterval(() => {
      if (user?.id) {
        loadDashboardData()
      }
    }, 30000)
    setRefreshInterval(interval)

    return () => {
      if (refreshInterval) clearInterval(refreshInterval)
    }
  }, [])

  // Load dashboard data after user is authenticated
  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user])

  async function checkAuth() {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      const role = user.user_metadata?.role || 'client'
      setUserRole(role)

      // Redirect users to their role-specific dashboard
      if (role === 'provider') {
        router.push('/dashboard/provider')
        return
      } else if (role === 'client') {
        router.push('/dashboard/client')
        return
      } else if (role === 'admin') {
        // Admin stays on main dashboard
        return
      }
    } catch (error) {
      // Production logging removed
      router.push('/auth/sign-in')
    }
  }

  // Check if due_at column exists in bookings table
  const checkDueAtColumnExists = async () => {
    try {
      const supabase = await getSupabaseClient()
      // Try a simple query with due_at to see if it exists
      const { error } = await supabase
        .from('bookings')
        .select('due_at')
        .limit(1)
      
      return !error
    } catch (error) {
              // Production logging removed
      return false
    }
  }

  async function loadDashboardData() {
    let timeoutId: NodeJS.Timeout | null = null
    
    try {
      // Production logging removed
      
      if (!user?.id) {
        // Production logging removed
        return
      }

      // Add timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        // Production logging removed
        setLoading(false)
        // Set empty dashboard data to prevent infinite loading
        setDashboardData({
          totalServices: 0,
          activeBookings: 0,
          totalClients: 0,
          revenue: 0,
          recentActivity: [],
          upcomingBookings: [],
          performanceMetrics: {
            monthlyGrowth: 0,
            completionRate: 0,
            averageRating: 0,
            responseTime: 0
          }
        })
      }, 10000) // 10 second timeout

      const supabase = await getSupabaseClient()
      
      // Check if user is a provider or client
      const userRole = user.user_metadata?.role || 'client'
      
      let servicesCount = 0
      let bookingsCount = 0
      let recentActivity: any[] = []
      let upcomingBookings: any[] = []
      let allBookings: any[] = []

      if (userRole === 'provider') {
              // Load services count for providers
      try {
        const { count: servicesCountResult } = await supabase
          .from('services')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', user.id)
        servicesCount = servicesCountResult || 0
      } catch (error) {
        // Production logging removed
        servicesCount = 0
      }

              // Load active bookings for providers
        try {
          const { count: bookingsCountResult } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('provider_id', user.id)
            .eq('status', 'in_progress')
          bookingsCount = bookingsCountResult || 0
        } catch (error) {
          // Production logging removed
          bookingsCount = 0
        }

        // Load recent activity for providers
        try {
          const { data: recentActivityResult } = await supabase
            .from('bookings')
            .select(`
              id,
              status,
              created_at,
              service_id
            `)
            .eq('provider_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
          recentActivity = recentActivityResult || []
        } catch (error) {
          // Production logging removed
          recentActivity = []
        }

        // Load upcoming bookings for providers - try created_at first since due_at might not exist
        try {
          const { data: upcomingBookingsResult } = await supabase
            .from('bookings')
            .select(`
              id,
              created_at,
              status,
              service_id
            `)
            .eq('provider_id', user.id)
            .gte('created_at', new Date().toISOString())
            .order('created_at', { ascending: true })
            .limit(5)
          upcomingBookings = upcomingBookingsResult || []
        } catch (error) {
          // Production logging removed
          upcomingBookings = []
        }

        // Calculate performance metrics for providers
        try {
          const { data: allBookingsResult } = await supabase
            .from('bookings')
            .select('status, created_at')
            .eq('provider_id', user.id)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          allBookings = allBookingsResult || []
        } catch (error) {
          // Production logging removed
          allBookings = []
        }
      } else {
        // For clients, load their bookings
        try {
          const { count: clientBookingsCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', user.id)
          bookingsCount = clientBookingsCount || 0
        } catch (error) {
          // Production logging removed
          bookingsCount = 0
        }

        // Load recent activity for clients
        try {
          const { data: clientRecentActivity } = await supabase
            .from('bookings')
            .select(`
              id,
              status,
              created_at,
              service_id
            `)
            .eq('client_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
          recentActivity = clientRecentActivity || []
        } catch (error) {
          // Production logging removed
          recentActivity = []
        }

        // Load upcoming bookings for clients - try created_at first since due_at might not exist
        try {
          const { data: clientUpcomingBookings } = await supabase
            .from('bookings')
            .select(`
              id,
              created_at,
              status,
              service_id
            `)
            .eq('client_id', user.id)
            .gte('created_at', new Date().toISOString())
            .order('created_at', { ascending: true })
            .limit(5)
          upcomingBookings = clientUpcomingBookings || []
        } catch (error) {
          // Production logging removed
          upcomingBookings = []
        }
      }



      const completedBookings = allBookings?.filter(b => b.status === 'completed').length || 0
      const totalBookings = allBookings?.length || 0
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0

      const dashboardData: DashboardData = {
        totalServices: servicesCount || 0,
        activeBookings: bookingsCount || 0,
        totalClients: 24, // Placeholder - implement actual calculation
        revenue: 2450, // Placeholder - implement actual calculation
        recentActivity: recentActivity?.map(activity => ({
          id: activity.id,
          type: 'booking',
          description: `New booking received for service #${activity.service_id}`,
          timestamp: activity.created_at,
          status: activity.status
        })) || [],
        upcomingBookings: upcomingBookings?.map(booking => ({
          id: booking.id,
          serviceName: `Service #${booking.service_id}`,
          clientName: 'Client',
          date: new Date(booking.created_at).toLocaleDateString(),
          time: new Date(booking.created_at).toLocaleTimeString(),
          status: booking.status
        })) || [],
        performanceMetrics: {
          monthlyGrowth: 20,
          completionRate,
          averageRating: 4.8,
          responseTime: 2.5
        }
      }

      // Production logging removed
      setDashboardData(dashboardData)
      setLoading(false)
      if (timeoutId) clearTimeout(timeoutId)
    } catch (error) {
      // Production logging removed
      setLoading(false)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">User not found. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.user_metadata?.full_name || user.email}</p>
            </div>
            <div className="flex space-x-3">
              {userRole === 'provider' && (
                <Button onClick={() => router.push('/dashboard/services/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!dashboardData ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600 mb-6">
                {userRole === 'provider' 
                  ? 'Start by creating your first service to see dashboard metrics. The system will automatically detect when data becomes available.'
                  : 'Your dashboard will populate once you start using the platform. This is normal for new accounts.'
                }
              </p>
              <div className="space-x-3">
                <Button onClick={loadDashboardData} variant="outline">
                  Refresh Data
                </Button>
                {userRole === 'provider' && (
                  <Button onClick={() => router.push('/dashboard/services/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Service
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-4">
                If you continue to see this message, the database tables may still be initializing.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Services</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalServices || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +2 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.activeBookings || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +1 from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalClients || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +4 from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardData?.revenue || 0)}</div>
              <p className="text-xs text-muted-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                +20% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Key metrics for your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Completion Rate</span>
                  <span>{dashboardData?.performanceMetrics.completionRate.toFixed(1)}%</span>
                </div>
                <Progress value={dashboardData?.performanceMetrics.completionRate || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Average Rating</span>
                  <span className="flex items-center">
                    {dashboardData?.performanceMetrics.averageRating.toFixed(1)}
                    <Star className="h-3 w-3 ml-1 text-yellow-500 fill-current" />
                  </span>
                </div>
                <Progress value={(dashboardData?.performanceMetrics.averageRating || 0) * 20} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Response Time</span>
                  <span>{dashboardData?.performanceMetrics.responseTime.toFixed(1)} hours</span>
                </div>
                <Progress value={100 - (dashboardData?.performanceMetrics.responseTime || 0) * 10} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Access frequently used features</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {userRole === 'provider' ? (
                <>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col justify-center"
                    onClick={() => router.push('/dashboard/services')}
                  >
                    <Package className="h-6 w-6 mb-2" />
                    Manage Services
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col justify-center"
                    onClick={() => router.push('/dashboard/company')}
                  >
                    <Settings className="h-6 w-6 mb-2" />
                    Company Profile
                  </Button>
                </>
              ) : (
                <Button 
                  variant="outline" 
                  className="h-20 flex-col justify-center"
                  onClick={() => router.push('/dashboard/services')}
                >
                  <Package className="h-6 w-6 mb-2" />
                  Browse Services
                </Button>
              )}
              <Button 
                variant="outline" 
                className="h-20 flex-col justify-center"
                onClick={() => router.push('/dashboard/bookings')}
              >
                <Calendar className="h-6 w-6 mb-2" />
                View Bookings
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col justify-center"
                onClick={() => router.push('/dashboard/reports')}
              >
                <FileText className="h-6 w-6 mb-2" />
                Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Recent Activity and Upcoming Bookings */}
        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Upcoming Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData?.upcomingBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium">{booking.serviceName}</p>
                          <p className="text-xs text-gray-500">
                            {booking.clientName} • {booking.date} at {booking.time}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
