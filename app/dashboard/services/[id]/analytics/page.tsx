'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Calendar, 
  DollarSign, 
  Star, 
  Users, 
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Zap,
  RefreshCw
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

interface ServiceAnalytics {
  id: string
  title: string
  totalViews: number
  totalBookings: number
  totalRevenue: number
  averageRating: number
  totalReviews: number
  conversionRate: number
  averageResponseTime: number
  completionRate: number
}

interface BookingTrend {
  month: string
  count: number
  revenue: number
}

interface RevenueData {
  month: string
  amount: number
  growth: number
}

interface ReviewData {
  rating: number
  count: number
  percentage: number
}

export default function ServiceAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const serviceId = params.id as string
  
  const [analytics, setAnalytics] = useState<ServiceAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [bookingTrends, setBookingTrends] = useState<BookingTrend[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [reviewDistribution, setReviewDistribution] = useState<ReviewData[]>([])
  const [topClients, setTopClients] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [serviceId, timeRange])

  const loadAnalytics = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Check user authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a provider
      if (user.user_metadata?.role !== 'provider') {
        router.push('/dashboard')
        return
      }

      // Fetch service details
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .eq('provider_id', user.id)
        .single()

      if (serviceError) throw serviceError

      // Fetch bookings for this service
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*, profiles!bookings_client_id_fkey(full_name, avatar_url)')
        .eq('service_id', serviceId)
        .order('created_at', { ascending: false })

      if (bookingsError) throw bookingsError

      // Fetch reviews for this service - reviews are linked to services through bookings
      const { data: serviceBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('service_id', serviceId)
      
      const serviceBookingIds = serviceBookings?.map(b => b.id) || []
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating, created_at')
        .in('booking_id', serviceBookingIds)

      if (reviewsError) throw reviewsError

      // Calculate analytics
      const totalViews = service.views_count || 0
      const totalBookings = bookings?.length || 0
      const totalRevenue = bookings
        ?.filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b) => sum + (b.amount || 0), 0) || 0
      
      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0
      
      const totalReviews = reviews?.length || 0
      const conversionRate = totalViews > 0 ? (totalBookings / totalViews) * 100 : 0
      const completionRate = totalBookings > 0 
        ? (bookings?.filter(b => b.status === 'completed').length || 0) / totalBookings * 100
        : 0

      setAnalytics({
        id: service.id,
        title: service.title,
        totalViews,
        totalBookings,
        totalRevenue,
        averageRating,
        totalReviews,
        conversionRate,
        averageResponseTime: 2.5, // Mock data
        completionRate
      })

      // Generate booking trends
      const trends = generateBookingTrends(bookings || [], timeRange)
      setBookingTrends(trends)

      // Generate revenue data
      const revenue = generateRevenueData(bookings || [], timeRange)
      setRevenueData(revenue)

      // Generate review distribution
      const reviewDistribution = generateReviewDistribution(reviews || [])
      setReviewDistribution(reviewDistribution)

      // Get top clients
      const clients = getTopClients(bookings || [])
      setTopClients(clients)

      // Get recent activity
      const activity = getRecentActivity(bookings || [])
      setRecentActivity(activity)

    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateBookingTrends = (bookings: any[], range: string): BookingTrend[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const trends: BookingTrend[] = []
    
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      const monthKey = months[date.getMonth()]
      
      const monthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === date.getMonth() && 
               bookingDate.getFullYear() === date.getFullYear()
      })
      
      trends.push({
        month: monthKey,
        count: monthBookings.length,
        revenue: monthBookings.reduce((sum, b) => sum + (b.amount || 0), 0)
      })
    }
    
    return trends
  }

  const generateRevenueData = (bookings: any[], range: string): RevenueData[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const revenue: RevenueData[] = []
    
    for (let i = 0; i < 12; i++) {
      const monthBookings = bookings.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === i
      })
      
      const amount = monthBookings.reduce((sum, b) => sum + (b.amount || 0), 0)
      const prevAmount = i > 0 ? revenue[i - 1]?.amount || 0 : 0
      const growth = prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : 0
      
      revenue.push({
        month: months[i],
        amount,
        growth
      })
    }
    
    return revenue
  }

  const generateReviewDistribution = (reviews: any[]): ReviewData[] => {
    const distribution: ReviewData[] = []
    const total = reviews.length
    
    for (let rating = 1; rating <= 5; rating++) {
      const count = reviews.filter(r => r.rating === rating).length
      distribution.push({
        rating,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      })
    }
    
    return distribution
  }

  const getTopClients = (bookings: any[]): any[] => {
    const clientMap = new Map()
    
    bookings.forEach(booking => {
      const clientId = booking.client_id
      const clientName = booking.profiles?.full_name || 'Unknown Client'
      const amount = booking.amount || 0
      
      if (clientMap.has(clientId)) {
        clientMap.get(clientId).totalSpent += amount
        clientMap.get(clientId).bookingsCount += 1
      } else {
        clientMap.set(clientId, {
          id: clientId,
          name: clientName,
          totalSpent: amount,
          bookingsCount: 1
        })
      }
    })
    
    return Array.from(clientMap.values())
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
  }

  const getRecentActivity = (bookings: any[]): any[] => {
    return bookings
      .slice(0, 10)
      .map(booking => ({
        id: booking.id,
        type: 'booking',
        status: booking.status,
        amount: booking.amount,
        clientName: booking.profiles?.full_name || 'Unknown Client',
        date: booking.created_at,
        description: `New ${booking.status} booking from ${booking.profiles?.full_name || 'Unknown Client'}`
      }))
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

  if (!analytics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Service not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Service Analytics</h1>
            <p className="text-gray-600 mt-2">{analytics.title}</p>
          </div>
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
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.totalReviews} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <CardDescription>Views to bookings ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {analytics.conversionRate.toFixed(1)}%
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {analytics.totalBookings} bookings from {analytics.totalViews} views
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CardDescription>Successfully completed bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analytics.completionRate.toFixed(1)}%
            </div>
            <div className="mt-2 text-sm text-gray-600">
              High completion rate indicates quality service
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <CardDescription>Average response to inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {analytics.averageResponseTime}h
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Fast response time improves client satisfaction
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Trends</CardTitle>
                <CardDescription>Monthly booking volume and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookingTrends.slice(-6).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{trend.month}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">{trend.count} bookings</span>
                        <span className="text-sm text-green-600">
                          {formatCurrency(trend.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Review Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Review Distribution</CardTitle>
                <CardDescription>Rating breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewDistribution.map((review) => (
                    <div key={review.rating} className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1 w-16">
                        <span className="text-sm">{review.rating}</span>
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full" 
                          style={{ width: `${review.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">
                        {review.count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
              <CardDescription>Latest booking activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(activity.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(activity.amount)}</p>
                      <Badge variant={activity.status === 'completed' ? 'default' : 'secondary'}>
                        {activity.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth</CardTitle>
              <CardDescription>Monthly revenue trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueData.slice(-6).map((revenue, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{revenue.month}</span>
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">{formatCurrency(revenue.amount)}</span>
                      <span className={`text-sm ${
                        revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {revenue.growth >= 0 ? '+' : ''}{revenue.growth.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Clients</CardTitle>
              <CardDescription>Highest value clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topClients.map((client, index) => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {client.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-gray-600">
                          {client.bookingsCount} bookings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(client.totalSpent)}</p>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
