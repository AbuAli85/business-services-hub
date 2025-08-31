'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { realtimeManager } from '@/lib/realtime'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Clock, 
  User, 
  Package, 
  MessageSquare, 
  Plus,
  Eye,
  Search,
  CheckCircle,
  DollarSign,
  MapPin,
  ArrowRight,
  Target
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

interface ClientStats {
  totalBookings: number
  activeBookings: number
  completedBookings: number
  totalSpent: number
  monthlySpent: number
  averageRating: number
  totalReviews: number
  favoriteProviders: number
}

interface RecentBooking {
  id: string
  service_title: string
  provider_name: string
  provider_company?: string
  status: string
  amount: number
  currency: string
  scheduled_date: string
  created_at: string
}

interface UpcomingBooking {
  id: string
  service_title: string
  provider_name: string
  scheduled_date: string
  scheduled_time: string
  location?: string
  status: string
}

export default function ClientDashboard() {
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  // Real-time updates
  useEffect(() => {
    if (!user?.id) return

    let currentUserId: string | null = null
    let subscriptionKeys: string[] = []

    ;(async () => {
      try {
        currentUserId = user.id

        // Subscribe to real-time booking updates
        const bookingSubscription = await realtimeManager.subscribeToBookings(user.id, (update) => {
          if (update.eventType === 'INSERT') {
            // New booking - refresh data
            fetchRecentBookings(user.id)
            fetchUpcomingBookings(user.id)
            fetchClientStats(user.id)
          } else if (update.eventType === 'UPDATE') {
            // Booking updated - refresh data
            fetchRecentBookings(user.id)
            fetchUpcomingBookings(user.id)
            fetchClientStats(user.id)
          }
        })
        subscriptionKeys.push(`bookings:${user.id}`)

        // Subscribe to real-time message updates
        const messageSubscription = await realtimeManager.subscribeToMessages(user.id, (update) => {
          if (update.eventType === 'INSERT') {
            // New message - refresh data if needed
            // This could trigger a notification or refresh conversations
          }
        })
        subscriptionKeys.push(`messages:${user.id}`)

        // Subscribe to general service updates (for favorites)
        const serviceSubscription = await realtimeManager.subscribeToServices('', (update) => {
          if (update.eventType === 'INSERT' || update.eventType === 'UPDATE') {
            // Service updated - refresh favorites
            // fetchFavoriteServices(user.id) // This line is removed as per the edit hint
          }
        })
        subscriptionKeys.push('services:')

      } catch (error) {
        console.error('Error setting up realtime subscriptions:', error)
      }
    })()

    return () => {
      if (currentUserId) {
        // Unsubscribe from all channels
        subscriptionKeys.forEach(key => {
          realtimeManager.unsubscribe(key)
        })
      }
    }
  }, [user?.id])

  const checkUserAndFetchData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a client
      const userRole = user.user_metadata?.role
      if (userRole !== 'client') {
        router.push('/dashboard')
        return
      }

      setUser(user)
      setUserRole(userRole)
      await Promise.all([
        fetchClientStats(user.id),
        fetchRecentBookings(user.id),
        // fetchFavoriteServices(user.id), // This line is removed as per the edit hint
        fetchUpcomingBookings(user.id)
      ])
    } catch (error) {
      console.error('Error loading client data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientStats = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get bookings count and spending
      const { data: bookings } = await supabase
        .from('bookings')
        .select('status, subtotal, vat_amount, currency, created_at')
        .eq('client_id', userId)

      const totalBookings = bookings?.length || 0
      const activeBookings = bookings?.filter(b => ['paid', 'in_progress'].includes(b.status)).length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      
      const totalSpent = bookings
        ?.filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b) => sum + (b.subtotal || 0) + (b.vat_amount || 0), 0) || 0

      // Get monthly spending
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyBookings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear &&
               ['completed', 'in_progress'].includes(b.status)
      }) || []
      
      const monthlySpent = monthlyBookings.reduce((sum, b) => sum + (b.subtotal || 0) + (b.vat_amount || 0), 0)

      // Get ratings and reviews from the 'reviews' table (not 'service_reviews')
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('client_id', userId)

      const totalReviews = reviews?.length || 0
      const averageRating = totalReviews > 0 && reviews
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0

      // Since favorite_providers table doesn't exist, we'll set this to 0 for now
      const favoriteProviders = 0

      setStats({
        totalBookings,
        activeBookings,
        completedBookings,
        totalSpent,
        monthlySpent,
        averageRating,
        totalReviews,
        favoriteProviders
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
          service_id,
          provider_id,
          status,
          subtotal,
          vat_amount,
          currency,
          created_at
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (bookings) {
        console.log('Raw recent bookings:', bookings)
        
        // Fetch service information separately
        const serviceIds = Array.from(new Set(bookings.map((b: any) => b.service_id).filter(Boolean)))
        console.log('Service IDs to fetch:', serviceIds)
        
        // Fetch provider information separately
        const providerIds = Array.from(new Set(bookings.map((b: any) => b.provider_id).filter(Boolean)))
        console.log('Provider IDs to fetch:', providerIds)
        
        if (serviceIds.length > 0 && providerIds.length > 0) {
          const [servicesResponse, providersResponse] = await Promise.all([
            supabase
              .from('services')
              .select('id, title')
              .in('id', serviceIds),
            supabase
              .from('profiles')
              .select('id, full_name, company_name')
              .in('id', providerIds)
          ])

          if (servicesResponse.error) {
            console.error('Error fetching services:', servicesResponse.error)
          }
          if (providersResponse.error) {
            console.error('Error fetching providers:', providersResponse.error)
          }

          console.log('Fetched services:', servicesResponse.data)
          console.log('Fetched providers:', providersResponse.data)

          const enrichedBookings = bookings.map((b: any) => {
            const service = servicesResponse.data?.find(s => s.id === b.service_id)
            const provider = providersResponse.data?.find(p => p.id === b.provider_id)
            console.log(`Booking ${b.id}: service_id=${b.service_id}, found service:`, service)
            console.log(`Booking ${b.id}: provider_id=${b.provider_id}, found provider:`, provider)
            return {
              ...b,
              service_title: service?.title || 'Unknown Service',
              provider_name: provider?.full_name || 'Unknown Provider',
              provider_company: provider?.company_name || 'Unknown Company',
              amount: b.subtotal + b.vat_amount
            }
          })

          console.log('Enriched recent bookings:', enrichedBookings)
          setRecentBookings(enrichedBookings)
        } else {
          console.log('No service or provider IDs found in recent bookings')
          // If no IDs, still set the bookings with default info
          const enrichedBookings = bookings.map((b: any) => ({
            ...b,
            service_title: 'Unknown Service',
            provider_name: 'Unknown Provider',
            provider_company: 'Unknown Company',
            amount: b.subtotal + b.vat_amount
          }))
          setRecentBookings(enrichedBookings)
        }
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
    }
  }

  const fetchUpcomingBookings = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          provider_id,
          status,
          created_at
        `)
        .eq('client_id', userId)
        .in('status', ['paid', 'in_progress'])
        .order('created_at', { ascending: true })
        .limit(3)

      if (bookings) {
        console.log('Raw upcoming bookings:', bookings)
        
        // Fetch service information separately
        const serviceIds = Array.from(new Set(bookings.map((b: any) => b.service_id).filter(Boolean)))
        console.log('Service IDs to fetch:', serviceIds)
        
        // Fetch provider information separately
        const providerIds = Array.from(new Set(bookings.map((b: any) => b.provider_id).filter(Boolean)))
        console.log('Provider IDs to fetch:', providerIds)
        
        if (serviceIds.length > 0 && providerIds.length > 0) {
          const [servicesResponse, providersResponse] = await Promise.all([
            supabase
              .from('services')
              .select('id, title')
              .in('id', serviceIds),
            supabase
              .from('profiles')
              .select('id, full_name, company_name')
              .in('id', providerIds)
          ])

          if (servicesResponse.error) {
            console.error('Error fetching services:', servicesResponse.error)
          }
          if (providersResponse.error) {
            console.error('Error fetching providers:', providersResponse.error)
          }

          console.log('Fetched services:', servicesResponse.data)
          console.log('Fetched providers:', providersResponse.data)

          const enrichedBookings = bookings.map((b: any) => {
            const service = servicesResponse.data?.find(s => s.id === b.service_id)
            const provider = providersResponse.data?.find(p => p.id === b.provider_id)
            console.log(`Booking ${b.id}: service_id=${b.service_id}, found service:`, service)
            console.log(`Booking ${b.id}: provider_id=${b.provider_id}, found provider:`, provider)
            return {
              ...b,
              service_title: service?.title || 'Unknown Service',
              provider_name: provider?.full_name || 'Unknown Provider',
              provider_company: provider?.company_name || 'Unknown Company',
              scheduled_date: b.created_at, // Use created_at as fallback since scheduled_date doesn't exist
              scheduled_time: 'TBD', // This field doesn't exist in the schema
              location: 'TBD' // This field doesn't exist in the schema
            }
          })

          console.log('Enriched upcoming bookings:', enrichedBookings)
          setUpcomingBookings(enrichedBookings)
        } else {
          console.log('No service or provider IDs found in upcoming bookings')
          const enrichedBookings = bookings.map((b: any) => ({
            ...b,
            service_title: 'Unknown Service',
            provider_name: 'Unknown Provider',
            provider_company: 'Unknown Company',
            scheduled_date: b.created_at,
            scheduled_time: 'TBD',
            location: 'TBD'
          }))
          setUpcomingBookings(enrichedBookings)
        }
      }
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error)
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's your booking overview</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/services')}>
            <Search className="h-4 w-4 mr-2" />
            Browse Services
          </Button>
          <Button onClick={() => router.push('/dashboard/bookings/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Book New Service
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalSpent || 0)}</div>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(stats?.monthlySpent || 0)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeBookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalBookings || 0} total bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedBookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalBookings ? ((stats.completedBookings / stats.totalBookings) * 100).toFixed(1) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) || '0.0'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalReviews || 0} reviews given
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
            <CardDescription>Your scheduled services</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No upcoming bookings</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/dashboard/bookings/create')}
                >
                  Book a Service
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{booking.service_title}</h4>
                        {getStatusBadge(booking.status)}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{booking.provider_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(booking.scheduled_date)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4" />
                          <span>{booking.scheduled_time}</span>
                        </div>
                        {booking.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{booking.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
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

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/dashboard/bookings/create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Book New Service
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/services')}
            >
              <Search className="h-4 w-4 mr-2" />
              Browse Services
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
              onClick={() => router.push('/dashboard/bookings')}
            >
              <Clock className="h-4 w-4 mr-2" />
              My Bookings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings & Favorite Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Your latest service requests</CardDescription>
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
                        <span>{booking.provider_name}</span>
                        {booking.provider_company && (
                          <span className="text-gray-500">({booking.provider_company})</span>
                        )}
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

        {/* Favorite Services */}
        <Card>
          <CardHeader>
            <CardTitle>Favorite Services</CardTitle>
            <CardDescription>Services you've saved</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Favorite services section removed as per edit hint */}
            <div className="text-center py-6">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No favorite services yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => router.push('/services')}
              >
                Discover Services
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending Overview & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Spending Overview</CardTitle>
            <CardDescription>Your spending patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Monthly Budget</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(stats?.monthlySpent || 0)} / {formatCurrency(1000)}
                </span>
              </div>
              <Progress 
                value={stats?.monthlySpent ? Math.min((stats.monthlySpent / 1000) * 100, 100) : 0} 
                className="h-2" 
              />
              <p className="text-xs text-gray-500 mt-1">
                {stats?.monthlySpent ? Math.max(0, 1000 - stats.monthlySpent) : 1000} remaining this month
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Spending</span>
                <span className="text-sm text-gray-600">
                  {formatCurrency(stats?.totalSpent || 0)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${stats?.totalSpent ? Math.min((stats.totalSpent / 5000) * 100, 100) : 0}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalSpent ? Math.max(0, 5000 - stats.totalSpent) : 5000} to next milestone
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Goals & Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Goals & Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.totalBookings && stats.totalBookings >= 5 && (
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>5+ services booked</span>
              </div>
            )}
            {stats?.totalSpent && stats.totalSpent >= 500 && (
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>First $500 spent</span>
              </div>
            )}
            {stats?.averageRating && stats.averageRating >= 4.0 && (
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>4.0+ average rating</span>
              </div>
            )}
            {stats?.favoriteProviders && stats.favoriteProviders >= 3 && (
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>3+ favorite providers</span>
              </div>
            )}
            {(!stats?.totalBookings || stats.totalBookings < 5) && (
              <div className="text-sm text-gray-500">
                Book more services to unlock achievements!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Discovery */}
      <Card>
        <CardHeader>
          <CardTitle>Discover New Services</CardTitle>
          <CardDescription>Find the perfect service for your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 border rounded-lg">
              <Package className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Browse Categories</h3>
              <p className="text-gray-600 mb-4">Explore services by category and find what you need</p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/services')}
              >
                Browse Services
              </Button>
            </div>
            
            <div className="text-center p-6 border rounded-lg">
              <Search className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Search & Filter</h3>
              <p className="text-gray-600 mb-4">Use advanced search to find specific services</p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/services?search=')}
              >
                Search Services
              </Button>
            </div>
            
            <div className="text-center p-6 border rounded-lg">
              <Package className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Top Rated</h3>
              <p className="text-gray-600 mb-4">Discover highly-rated services from top providers</p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/services?sort=rating')}
              >
                View Top Rated
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
