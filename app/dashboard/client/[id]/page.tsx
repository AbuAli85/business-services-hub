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
  Clock as ClockIcon,
  Building2,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

interface ClientStats {
  totalBookings: number
  activeBookings: number
  completedBookings: number
  cancelledBookings: number
  totalSpent: number
  monthlySpent: number
  averageRating: number
  totalReviews: number
  favoriteProviders: number
  lastBookingDate: string
}

interface ClientBooking {
  id: string
  service_title: string
  provider_name: string
  provider_company: string
  status: string
  amount: number
  currency: string
  scheduled_date: string
  created_at: string
}

interface ClientProfile {
  id: string
  full_name: string
  email: string
  phone: string
  company_name: string
  role: string
  created_at: string
  last_login: string
}

export default function ClientDashboardById() {
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<ClientBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  useEffect(() => {
    checkUserAndFetchData()
  }, [clientId])

  const checkUserAndFetchData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a client, provider, or admin
      const userRole = user.user_metadata?.role
      if (userRole !== 'client' && userRole !== 'provider' && userRole !== 'admin') {
        router.push('/dashboard')
        return
      }

      // If user is a client, they can only view their own dashboard
      if (userRole === 'client' && user.id !== clientId) {
        router.push('/dashboard/client')
        return
      }

      setCurrentUser(user)
      setUserRole(userRole)

      // Fetch client profile information
      await fetchClientProfile(clientId)
      
      // Fetch dashboard data
      await Promise.all([
        fetchClientStats(clientId),
        fetchRecentBookings(clientId)
      ])
    } catch (error) {
      console.error('Error checking user and fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientProfile = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, company_name, role, created_at, last_login')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching client profile:', error)
        return
      }

      setClientProfile(profile)
    } catch (error) {
      console.error('Error fetching client profile:', error)
    }
  }

  const fetchClientStats = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get bookings count and spending
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, amount, currency, created_at, scheduled_date, provider_id')
        .eq('client_id', userId)

      const totalBookings = bookings?.length || 0
      const activeBookings = bookings?.filter(b => ['pending', 'approved', 'in_progress'].includes(b.status)).length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0
      
      const totalSpent = bookings
        ?.filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b) => sum + (b.amount || 0), 0) || 0

      // Get monthly spending
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyBookings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear &&
               ['completed', 'in_progress'].includes(b.status)
      }) || []
      
      const monthlySpent = monthlyBookings.reduce((sum, b) => sum + (b.amount || 0), 0)

      // Get last booking date
      const lastBooking = bookings?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      const lastBookingDate = lastBooking?.created_at || ''

      // Fetch reviews for rating calculation
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('client_id', userId)

      const totalReviews = reviews?.length || 0
      const averageRating = totalReviews > 0 && reviews
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0

      // Get unique providers count
      const uniqueProviders = new Set(bookings?.map(b => b.provider_id).filter(Boolean) || [])
      const favoriteProviders = uniqueProviders.size

      setStats({
        totalBookings,
        activeBookings,
        completedBookings,
        cancelledBookings,
        totalSpent,
        monthlySpent,
        averageRating,
        totalReviews,
        favoriteProviders,
        lastBookingDate
      })
    } catch (error) {
      console.error('Error fetching client stats:', error)
    }
  }

  const fetchRecentBookings = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
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
          provider_id
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (bookings) {
        // Get service titles and provider names separately
        const enrichedBookings = await Promise.all(
          bookings.map(async (booking) => {
            let serviceTitle = 'Unknown Service'
            let providerName = 'Unknown Provider'
            let providerCompany = 'Unknown Company'

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

              // Get provider name and company
              if (booking.provider_id) {
                const { data: provider } = await supabase
                  .from('profiles')
                  .select('full_name, company_name')
                  .eq('id', booking.provider_id)
                  .single()
                providerName = provider?.full_name || 'Unknown Provider'
                providerCompany = provider?.company_name || 'Unknown Company'
              }
            } catch (error) {
              console.error('Error enriching booking data:', error)
            }

            return {
              ...booking,
              service_title: serviceTitle,
              provider_name: providerName,
              provider_company: providerCompany
            }
          })
        )

        setRecentBookings(enrichedBookings)
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
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
    if (!clientProfile) return 'Welcome back! Here\'s your client overview'
    
    if (clientProfile.company_name) {
      return `Welcome back, ${clientProfile.company_name}! Here's your client overview`
    } else if (clientProfile.full_name) {
      return `Welcome back, ${clientProfile.full_name}! Here's your client overview`
    }
    
    return 'Welcome back! Here\'s your client overview'
  }

  // Get dashboard title
  const getDashboardTitle = () => {
    if (!clientProfile) return 'Client Dashboard'
    
    if (clientProfile.company_name) {
      return `${clientProfile.company_name} Dashboard`
    } else if (clientProfile.full_name) {
      return `${clientProfile.full_name}'s Dashboard`
    }
    
    return 'Client Dashboard'
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

  if (!clientProfile) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Client Not Found</h2>
          <p className="text-gray-600 mb-4">The client you're looking for doesn't exist or you don't have permission to view their dashboard.</p>
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
                {/* Client Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  {clientProfile.email && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>{clientProfile.email}</span>
                    </div>
                  )}
                  {clientProfile.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{clientProfile.phone}</span>
                    </div>
                  )}
                  {clientProfile.company_name && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4" />
                      <span>{clientProfile.company_name}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={() => router.push('/dashboard/services')} className="h-12 px-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Services
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
                  <CardTitle className="text-sm font-medium text-gray-700">Total Spent</CardTitle>
                  <Wallet className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats?.totalSpent || 0)}</div>
                  <p className="text-xs text-green-600 font-medium">
                    +{formatCurrency(stats?.monthlySpent || 0)} this month
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
                  <div className="text-2xl font-bold text-gray-900">{stats?.activeBookings || 0}</div>
                  <p className="text-xs text-blue-600 font-medium">
                    {stats?.totalBookings || 0} total bookings
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-100 hover:shadow-xl transition-all duration-300">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-400/20 to-violet-500/20 rounded-full -translate-y-10 translate-x-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-gray-700">Completed</CardTitle>
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-2xl font-bold text-gray-900">{stats?.completedBookings || 0}</div>
                  <p className="text-xs text-purple-600 font-medium">
                    {stats?.cancelledBookings || 0} cancelled
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
          {/* Client Activity Metrics */}
          <div className="lg:col-span-2 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-indigo-50/30 to-blue-100/40 rounded-3xl -m-4"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl -m-4"></div>
            <Card className="relative border-0 shadow-lg bg-white/80 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Client Activity</CardTitle>
                <CardDescription className="text-gray-600">Your booking activity and spending patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Booking Success Rate</span>
                    <span className="text-sm text-gray-600">
                      {stats?.totalBookings ? ((stats.completedBookings / stats.totalBookings) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={stats?.totalBookings ? (stats.completedBookings / stats.totalBookings) * 100 : 0} 
                    className="h-2" 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.completedBookings || 0} completed out of {stats?.totalBookings || 0} total bookings
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Monthly Spending</span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(stats?.monthlySpent || 0)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${stats?.totalSpent ? Math.min((stats.monthlySpent / stats.totalSpent) * 100, 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatCurrency(stats?.monthlySpent || 0)} spent this month
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Favorite Providers</span>
                    <span className="text-sm text-gray-600">
                      {stats?.favoriteProviders || 0} providers
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-2 bg-purple-500 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((stats?.favoriteProviders || 0) * 20, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Working with {stats?.favoriteProviders || 0} different providers
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
                  onClick={() => router.push('/dashboard/services')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Services
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/bookings')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  View Bookings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/messages')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
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

        {/* Enhanced Recent Bookings */}
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
                    <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm">{booking.service_title}</h4>
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-600">
                          <span className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{booking.provider_name}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>{booking.provider_company}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(booking.scheduled_date)}</span>
                          </span>
                          <span className="font-medium">{formatCurrency(booking.amount, booking.currency)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/provider/${booking.provider_id}`)}
                          title="View Provider Profile"
                        >
                          <Building2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                          title="View Booking Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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

        {/* Client Achievements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Client Goals</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Monthly Spending Target</span>
                  <span className="text-sm text-gray-600">
                    {formatCurrency(stats?.monthlySpent || 0)} / {formatCurrency(2000)}
                  </span>
                </div>
                <Progress 
                  value={stats?.monthlySpent ? Math.min((stats.monthlySpent / 2000) * 100, 100) : 0} 
                  className="h-2" 
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Bookings Target</span>
                  <span className="text-sm text-gray-600">
                    {stats?.totalBookings || 0} / 10
                  </span>
                </div>
                <Progress 
                  value={stats?.totalBookings ? Math.min((stats.totalBookings / 10) * 100, 100) : 0} 
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
              {stats?.totalSpent && stats.totalSpent >= 1000 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>First $1K spent</span>
                </div>
              )}
              {stats?.totalBookings && stats.totalBookings >= 5 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>5+ bookings completed</span>
                </div>
              )}
              {stats?.averageRating && stats.averageRating >= 4.0 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>4.0+ star rating</span>
                </div>
              )}
              {stats?.favoriteProviders && stats.favoriteProviders >= 3 && (
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>3+ providers worked with</span>
                </div>
              )}
              {(!stats?.totalSpent || stats.totalSpent < 1000) && (
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

