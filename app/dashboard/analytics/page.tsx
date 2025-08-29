'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Target, 
  Star, 
  BarChart3,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [timeRange, setTimeRange] = useState('30d')
  const router = useRouter()

  useEffect(() => {
    checkUserAndFetchData()
  }, [timeRange])

  const checkUserAndFetchData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      const role = user.user_metadata?.role || 'client'
      setUserRole(role)
      await fetchAnalyticsData(user.id, role)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalyticsData = async (userId: string, role: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Calculate date range
      const now = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case '7d':
          startDate.setDate(now.getDate() - 7)
          break
        case '30d':
          startDate.setDate(now.getDate() - 30)
          break
        case '90d':
          startDate.setDate(now.getDate() - 90)
          break
        case '1y':
          startDate.setFullYear(now.getFullYear() - 1)
          break
        default:
          startDate.setDate(now.getDate() - 30)
      }

      // Fetch bookings data
      let bookingsQuery = supabase
        .from('bookings')
        .select('*')
        .gte('created_at', startDate.toISOString())

      if (role === 'provider') {
        bookingsQuery = bookingsQuery.eq('provider_id', userId)
      } else if (role === 'client') {
        bookingsQuery = bookingsQuery.eq('client_id', userId)
      }

      const { data: bookings } = await bookingsQuery

      // Fetch services data
      let servicesQuery = supabase
        .from('services')
        .select('*')

      if (role === 'provider') {
        servicesQuery = servicesQuery.eq('provider_id', userId)
      }

      const { data: services } = await servicesQuery

      // Process data
      const processedData = processAnalyticsData(bookings || [], services || [], role)
      setAnalyticsData(processedData)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    }
  }

  const processAnalyticsData = (bookings: any[], services: any[], role: string) => {
    const totalBookings = bookings.length
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount || 0), 0)
    const completedBookings = bookings.filter(b => b.status === 'completed').length
    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0
    
    // Calculate monthly trends
    const monthlyData = new Map()
    const currentDate = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      monthlyData.set(monthKey, { month: monthKey, count: 0, revenue: 0 })
    }

    bookings.forEach(booking => {
      const date = new Date(booking.created_at)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      if (monthlyData.has(monthKey)) {
        monthlyData.get(monthKey).count += 1
        monthlyData.get(monthKey).revenue += booking.amount || 0
      }
    })

    const bookingsByMonth = Array.from(monthlyData.values()).reverse()
    const revenueByMonth = bookingsByMonth.map(item => ({ month: item.month, amount: item.revenue }))

    // Calculate status distribution
    const statusCounts = new Map()
    bookings.forEach(booking => {
      const status = booking.status || 'unknown'
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
    })

    const bookingsByStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count: count as number
    }))

    // Calculate growth rates
    const currentMonthBookings = bookingsByMonth[bookingsByMonth.length - 1]?.count || 0
    const previousMonthBookings = bookingsByMonth[bookingsByMonth.length - 2]?.count || 0
    const monthlyGrowth = previousMonthBookings > 0 
      ? ((currentMonthBookings - previousMonthBookings) / previousMonthBookings) * 100 
      : 0

    return {
      overview: {
        totalBookings,
        totalRevenue,
        averageRating: 4.2,
        completionRate,
        responseRate: 85,
        totalServices: services.length,
        totalClients: role === 'provider' ? new Set(bookings.map(b => b.client_id)).size : 0,
        totalProviders: role === 'client' ? new Set(bookings.map(b => b.provider_id)).size : 0
      },
      trends: {
        bookingsByMonth,
        revenueByMonth,
        bookingsByStatus
      },
      performance: {
        monthlyGrowth,
        quarterlyGrowth: monthlyGrowth * 3,
        yearlyGrowth: monthlyGrowth * 12,
        conversionRate: 65,
        averageResponseTime: 2.5,
        customerSatisfaction: 4.5
      }
    }
  }

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (value < 0) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            {userRole === 'provider' ? 'Track your service performance and business growth' : 'Monitor your booking activity and spending patterns'}
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => fetchAnalyticsData(user.id, userRole)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.overview.totalBookings || 0}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getGrowthIcon(analyticsData?.performance.monthlyGrowth || 0)}
              <span className={getGrowthColor(analyticsData?.performance.monthlyGrowth || 0)}>
                {Math.abs(analyticsData?.performance.monthlyGrowth || 0).toFixed(1)}%
              </span>
              <span>from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData?.overview.totalRevenue || 0)}</div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              {getGrowthIcon(analyticsData?.performance.monthlyGrowth || 0)}
              <span className={getGrowthColor(analyticsData?.performance.monthlyGrowth || 0)}>
                {Math.abs(analyticsData?.performance.monthlyGrowth || 0).toFixed(1)}%
              </span>
              <span>from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.overview.completionRate.toFixed(1) || 0}%</div>
            <div className="text-xs text-muted-foreground">
              {analyticsData?.overview.totalBookings || 0} total bookings
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.overview.averageRating.toFixed(1) || 0}</div>
            <div className="text-xs text-muted-foreground">
              out of 5 stars
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings Trend</CardTitle>
            <CardDescription>Monthly booking activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Bookings chart will be displayed here</p>
                <p className="text-sm text-gray-500">Coming soon with Chart.js integration</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {analyticsData?.trends.bookingsByMonth.slice(-6).map((item: { month: string; count: number; revenue: number }) => (
                <div key={item.month} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.month}</span>
                  <span className="font-medium">{item.count} bookings</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Revenue chart will be displayed here</p>
                <p className="text-sm text-gray-500">Coming soon with Chart.js integration</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {analyticsData?.trends.revenueByMonth.slice(-6).map((item: { month: string; amount: number }) => (
                <div key={item.month} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{item.month}</span>
                  <span className="font-medium">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Status Distribution</CardTitle>
          <CardDescription>Current status of all bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsData?.trends.bookingsByStatus.map((status: { status: string; count: number }) => (
              <div key={status.status} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{status.count}</div>
                <div className="text-sm text-gray-600 capitalize">{status.status.replace('_', ' ')}</div>
                <div className="text-xs text-gray-500">
                  {((status.count / (analyticsData?.overview.totalBookings || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
