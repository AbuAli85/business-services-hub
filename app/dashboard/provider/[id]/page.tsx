'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  Clock, 
  User, 
  Package, 
  Star, 
  MessageSquare, 
  Settings, 
  Plus,
  Eye,
  Edit,
  BarChart3,
  Target,
  Award,
  Activity,
  Users,
  ShoppingCart,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock as ClockIcon
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

interface ProviderStats {
  totalServices: number
  activeServices: number
  totalBookings: number
  pendingBookings: number
  completedBookings: number
  totalEarnings: number
  monthlyEarnings: number
  averageRating: number
  totalReviews: number
  responseRate: number
  completionRate: number
}

interface RecentBooking {
  id: string
  service_title: string
  client_name: string
  status: string
  amount: number
  currency: string
  scheduled_date: string
  created_at: string
}

interface ServicePerformance {
  id: string
  title: string
  total_bookings: number
  total_revenue: number
  average_rating: number
  completion_rate: number
}

interface ProviderProfile {
  id: string
  full_name: string
  company_name: string
  role: string
}

export default function ProviderDashboardById() {
  const [stats, setStats] = useState<ProviderStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [topServices, setTopServices] = useState<ServicePerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const providerId = params.id as string

  useEffect(() => {
    checkUserAndFetchData()
  }, [providerId])

  const checkUserAndFetchData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a provider or admin
      const userRole = user.user_metadata?.role
      if (userRole !== 'provider' && userRole !== 'admin') {
        router.push('/dashboard')
        return
      }

      // If user is a provider, they can only view their own dashboard
      if (userRole === 'provider' && user.id !== providerId) {
        router.push('/dashboard/provider')
        return
      }

      setCurrentUser(user)
      setUserRole(userRole)

      // Fetch provider profile information
      await fetchProviderProfile(providerId)
      
      // Fetch dashboard data
      await Promise.all([
        fetchProviderStats(providerId),
        fetchRecentBookings(providerId),
        fetchTopServices(providerId)
      ])
    } catch (error) {
      console.error('Error checking user and fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProviderProfile = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, role')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching provider profile:', error)
        return
      }

      setProviderProfile(profile)
    } catch (error) {
      console.error('Error fetching provider profile:', error)
    }
  }

  const fetchProviderStats = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get services count
      const { count: totalServices } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', userId)

      const { count: activeServices } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', userId)
        .eq('status', 'active')
        .eq('approval_status', 'approved')

      // Get bookings count and earnings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, amount, currency, created_at')
        .eq('provider_id', userId)

      const totalBookings = bookings?.length || 0
      const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      
      const totalEarnings = bookings
        ?.filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b) => sum + (b.amount || 0), 0) || 0

      // Get monthly earnings
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyBookings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear &&
               ['completed', 'in_progress'].includes(b.status)
      }) || []
      
      const monthlyEarnings = monthlyBookings.reduce((sum, b) => sum + (b.amount || 0), 0)

      // Fetch reviews for rating calculation
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', userId)

      const totalReviews = reviews?.length || 0
      const averageRating = totalReviews > 0 && reviews
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0

      // Calculate response and completion rates
      const responseRate = totalBookings > 0 ? ((totalBookings - pendingBookings) / totalBookings) * 100 : 0
      const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0

      setStats({
        totalServices: totalServices || 0,
        activeServices: activeServices || 0,
        totalBookings,
        pendingBookings,
        completedBookings,
        totalEarnings,
        monthlyEarnings,
        averageRating,
        totalReviews,
        responseRate,
        completionRate
      })
    } catch (error) {
      console.error('Error fetching provider stats:', error)
    }
  }

  const fetchRecentBookings = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Use basic bookings table with simple join instead of enhanced_bookings view
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          amount,
          currency,
          scheduled_date,
          created_at,
          service_id,
          client_id
        `)
        .eq('provider_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (bookings) {
        // Get service titles and client names separately to avoid complex joins
        const enrichedBookings = await Promise.all(
          bookings.map(async (booking) => {
            let serviceTitle = 'Unknown Service'
            let clientName = 'Unknown Client'

            try {
              // Get service title
              if (booking.service_id) {
                const { data: service } = await supabase
                  .from('services')
                  .select('title')
                  .eq('id', booking.service_id)
                  .single()
                serviceTitle = service?.title || 'Unknown Service'
              }

              // Get client name
              if (booking.client_id) {
                const { data: client } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', booking.client_id)
                  .single()
                clientName = client?.full_name || 'Unknown Client'
              }
            } catch (error) {
              console.error('Error enriching booking data:', error)
            }

            return {
              ...booking,
              service_title: serviceTitle,
              client_name: clientName
            }
          })
        )

        setRecentBookings(enrichedBookings)
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
    }
  }

  const fetchTopServices = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // First get all services for this provider
      const { data: services } = await supabase
        .from('services')
        .select(`
          id,
          title,
          base_price,
          currency
        `)
        .eq('provider_id', userId)
        .eq('status', 'active')

      if (services) {
        // Calculate stats for each service
        const servicesWithStats = await Promise.all(
          services.map(async (service) => {
            // Get booking count for this service
            const { count: totalBookings } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('service_id', service.id)

            // Get total revenue from completed bookings
            const { data: completedBookings } = await supabase
              .from('bookings')
              .select('amount')
              .eq('service_id', service.id)
              .eq('status', 'completed')

            const totalRevenue = completedBookings?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0

            // Get average rating from reviews by joining through bookings
            const { data: serviceBookings } = await supabase
              .from('bookings')
              .select('id')
              .eq('service_id', service.id)
            
            const serviceBookingIds = serviceBookings?.map(b => b.id) || []
            const { data: reviews } = await supabase
              .from('reviews')
              .select('rating')
              .in('booking_id', serviceBookingIds)

            const averageRating = reviews && reviews.length > 0
              ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
              : 0

            return {
              ...service,
              total_bookings: totalBookings || 0,
              total_revenue: totalRevenue,
              average_rating: averageRating,
              completion_rate: (totalBookings || 0) > 0 ? ((completedBookings?.length || 0) / (totalBookings || 0)) * 100 : 0,
              service_name: service.title || 'Unknown Service'
            }
          })
        )

        // Sort by total bookings and take top 5
        const topServices = servicesWithStats
          .sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0))
          .slice(0, 5)

        setTopServices(topServices)
      }
    } catch (error) {
      console.error('Error fetching top services:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
      in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      declined: { color: 'bg-gray-100 text-gray-800', label: 'Declined' }
    }
    
    const statusConfig = config[status as keyof typeof config] || config.pending
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
  }

  const getRatingStars = (rating: number) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      )
    }
    return stars
  }

  // Get personalized welcome message
  const getWelcomeMessage = () => {
    if (!providerProfile) return 'Welcome back! Here\'s your business overview'
    
    if (providerProfile.company_name) {
      return `Welcome back, ${providerProfile.company_name}! Here's your business overview`
    } else if (providerProfile.full_name) {
      return `Welcome back, ${providerProfile.full_name}! Here's your business overview`
    }
    
    return 'Welcome back! Here\'s your business overview'
  }

  // Get dashboard title
  const getDashboardTitle = () => {
    if (!providerProfile) return 'Provider Dashboard'
    
    if (providerProfile.company_name) {
      return `${providerProfile.company_name} Dashboard`
    } else if (providerProfile.full_name) {
      return `${providerProfile.full_name}'s Dashboard`
    }
    
    return 'Provider Dashboard'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!providerProfile) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Provider Not Found</h2>
          <p className="text-gray-600 mb-4">The provider you're looking for doesn't exist or you don't have permission to view their dashboard.</p>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
        {/* Enhanced Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 rounded-3xl -m-4"></div>
          <div className="relative bg-white/80 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/30 shadow-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{getDashboardTitle()}</h1>
                    <p className="text-gray-600 mt-1">{getWelcomeMessage()}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => router.push('/dashboard/provider/create-service')} className="h-12 px-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
                <Button onClick={() => router.push('/dashboard/bookings')} className="h-12 px-6">
                  <Eye className="h-4 w-4 mr-2" />
                  View All Bookings
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/40 via-gray-50/30 to-slate-100/40 rounded-3xl -m-4"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/20 to-emerald-500/20 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-gray-700">Total Earnings</CardTitle>
                  <Wallet className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalEarnings || 0)}</div>
                  <p className="text-xs text-green-600 font-medium">
                    +{formatCurrency(stats?.monthlyEarnings || 0)} this month
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-gray-700">Active Bookings</CardTitle>
                  <Clock className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-gray-900">{stats?.pendingBookings || 0}</div>
                  <p className="text-xs text-blue-600 font-medium">
                    {stats?.totalBookings || 0} total bookings
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-100 hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-violet-500/20 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-gray-700">Active Services</CardTitle>
                  <Package className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-gray-900">{stats?.activeServices || 0}</div>
                  <p className="text-xs text-purple-600 font-medium">
                    {stats?.totalServices || 0} total services
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-100 hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-gray-700">Rating</CardTitle>
                  <Star className="h-5 w-5 text-amber-600" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-gray-900">{stats?.averageRating?.toFixed(1) || '0.0'}</div>
                  <p className="text-xs text-amber-600 font-medium">
                    {stats?.totalReviews || 0} reviews
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Enhanced Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Response & Completion Rates */}
          <div className="lg:col-span-2 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-indigo-50/30 to-blue-100/40 rounded-3xl -m-4"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
            <Card className="relative border-0 shadow-lg bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Performance Metrics</CardTitle>
                <CardDescription className="text-gray-600">Your response and completion rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Response Rate</span>
                    <span className="text-sm text-gray-600">{stats?.responseRate?.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats?.responseRate || 0} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    Responding to {(stats?.totalBookings || 0) - (stats?.pendingBookings || 0)} out of {stats?.totalBookings || 0} bookings
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm text-gray-600">{stats?.completionRate?.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats?.completionRate || 0} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    Completed {stats?.completedBookings} out of {stats?.totalBookings} bookings
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Monthly Growth</span>
                    <span className="text-sm text-green-600">
                      +{stats?.monthlyEarnings ? ((stats.monthlyEarnings / stats.totalEarnings) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-green-500 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${stats?.monthlyEarnings && stats.totalEarnings ? (stats.monthlyEarnings / stats.totalEarnings) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(stats?.monthlyEarnings || 0)} earned this month
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Quick Actions */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-pink-50/30 to-purple-100/40 rounded-3xl -m-4"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
            <Card className="relative border-0 shadow-lg bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/provider/create-service')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Service
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Manage Bookings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/messages')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Messages
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/profile')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Profile Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Recent Bookings & Top Services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Recent Bookings */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/40 via-emerald-50/30 to-green-100/40 rounded-3xl -m-4"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
            <Card className="relative border-0 shadow-lg bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Recent Bookings</CardTitle>
                <CardDescription className="text-gray-600">Latest booking requests and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {recentBookings.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No recent bookings</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-sm">{booking.service_title}</h4>
                            {getStatusBadge(booking.status)}
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-gray-600">
                            <span>{booking.client_name}</span>
                            <span>{formatDate(booking.scheduled_date)}</span>
                            <span className="font-medium">{formatCurrency(booking.amount, booking.currency)}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => router.push('/dashboard/bookings')}
                    >
                      View All Bookings
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Services */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/40 via-amber-50/30 to-orange-100/40 rounded-3xl -m-4"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
            <Card className="relative border-0 shadow-lg bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Top Performing Services</CardTitle>
                <CardDescription className="text-gray-600">Your most successful services</CardDescription>
              </CardHeader>
              <CardContent>
                {topServices.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No services yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topServices.map((service) => (
                      <div key={service.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{service.title}</h4>
                          <div className="flex items-center space-x-1">
                            {getRatingStars(service.average_rating)}
                            <span className="text-xs text-gray-600 ml-1">
                              ({service.average_rating.toFixed(1)})
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium">{service.total_bookings}</span> bookings
                          </div>
                          <div>
                            <span className="font-medium">{formatCurrency(service.total_revenue)}</span> revenue
                          </div>
                          <div>
                            <span className="font-medium">{service.completion_rate.toFixed(1)}%</span> completion
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => router.push('/dashboard/services')}
                    >
                      Manage Services
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Earnings Chart Placeholder */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-indigo-100/40 rounded-3xl -m-4"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
          <Card className="relative border-0 shadow-lg bg-white/80 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Earnings Overview</CardTitle>
              <CardDescription className="text-gray-600">Your earnings over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">Earnings chart will be displayed here</p>
                  <p className="text-sm text-gray-500">Coming soon with advanced analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals & Achievements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Monthly Goals</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Earnings Target</span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(stats?.monthlyEarnings || 0)} / {formatCurrency(5000)}
                  </span>
                </div>
                <Progress 
                  value={stats?.monthlyEarnings ? Math.min((stats.monthlyEarnings / 5000) * 100, 100) : 0} 
                  className="h-2" 
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bookings Target</span>
                  <span className="text-sm text-gray-600">
                    {stats?.totalBookings || 0} / 20
                  </span>
                </div>
                <Progress 
                  value={stats?.totalBookings ? Math.min((stats.totalBookings / 20) * 100, 100) : 0} 
                  className="h-2" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Achievements</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats?.totalEarnings && stats.totalEarnings >= 1000 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>First $1K earned</span>
                </div>
              )}
              {stats?.totalBookings && stats.totalBookings >= 10 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>10+ bookings completed</span>
                </div>
              )}
              {stats?.averageRating && stats.averageRating >= 4.5 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>4.5+ star rating achieved</span>
                </div>
              )}
              {stats?.responseRate && stats.responseRate >= 90 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>90%+ response rate</span>
                </div>
              )}
              {(!stats?.totalEarnings || stats.totalEarnings < 1000) && (
                <div className="text-sm text-gray-500">
                  Complete more bookings to unlock achievements!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}