'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
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

export default function EnhancedDashboardPage() {
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'upcoming'>('activity')

  useEffect(() => {
    checkAuth()
    loadDashboardData()
    
    // Set up real-time refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  async function checkAuth() {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUser({ ...user, profile })
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/auth/sign-in')
    }
  }

  async function loadDashboardData() {
    try {
      const supabase = await getSupabaseClient()
      
      // Load services count
      const { count: servicesCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', user?.id)

      // Load active bookings
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', user?.id)
        .eq('status', 'in_progress')

      // Load recent activity
      const { data: recentActivity } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          created_at,
          services!inner(title),
          profiles!bookings_client_id_fkey(full_name)
        `)
        .eq('provider_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Load upcoming bookings
      const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select(`
          id,
          due_at,
          status,
          services!inner(title),
          profiles!bookings_client_id_fkey(full_name)
        `)
        .eq('provider_id', user?.id)
        .gte('due_at', new Date().toISOString())
        .order('due_at', { ascending: true })
        .limit(5)

      // Calculate performance metrics
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('status, created_at')
        .eq('provider_id', user?.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

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
          description: `${(activity.profiles as any)?.full_name || 'Client'} booked '${(activity.services as any)?.title || 'Service'}'`,
          timestamp: activity.created_at,
          status: activity.status
        })) || [],
        upcomingBookings: upcomingBookings?.map(booking => ({
          id: booking.id,
          serviceName: (booking.services as any)?.title || 'Service',
          clientName: (booking.profiles as any)?.full_name || 'Client',
          date: new Date(booking.due_at).toLocaleDateString(),
          time: new Date(booking.due_at).toLocaleTimeString(),
          status: booking.status
        })) || [],
        performanceMetrics: {
          monthlyGrowth: 20,
          completionRate,
          averageRating: 4.8,
          responseTime: 2.5
        }
      }

      setDashboardData(dashboardData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setLoading(false)
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Enhanced Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.profile?.full_name || user.email}</p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={() => router.push('/dashboard/services/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${dashboardData?.performanceMetrics.completionRate || 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Average Rating</span>
                  <span className="flex items-center">
                    {dashboardData?.performanceMetrics.averageRating.toFixed(1)}
                    <Star className="h-3 w-3 ml-1 text-yellow-500 fill-current" />
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(dashboardData?.performanceMetrics.averageRating || 0) * 20}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Response Time</span>
                  <span>{dashboardData?.performanceMetrics.responseTime.toFixed(1)} hours</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${100 - (dashboardData?.performanceMetrics.responseTime || 0) * 10}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Access frequently used features</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
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
              <Button 
                variant="outline" 
                className="h-20 flex-col justify-center"
                onClick={() => router.push('/dashboard/company')}
              >
                <Settings className="h-6 w-6 mb-2" />
                Company Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Simple Tab-like Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Activity className="h-4 w-4 inline mr-2" />
                Recent Activity
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upcoming'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                Upcoming Bookings
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'activity' && (
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
        )}

        {activeTab === 'upcoming' && (
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
        )}
      </div>
    </div>
  )
}
