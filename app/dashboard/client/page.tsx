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
  TrendingUp,
  MapPin,
  ArrowRight,
  Target
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'react-hot-toast'

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

interface ServiceSuggestion {
  id: string
  suggested_service: {
    id: string
    title: string
    description: string
    base_price: number
    currency: string
    category: string
  }
  provider: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  suggestion_reason: string
  priority: string
  status: string
  created_at: string
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
  const [serviceSuggestions, setServiceSuggestions] = useState<ServiceSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
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

        // Subscribe to real-time service suggestions
        const suggestionsSubscription = await realtimeManager.subscribeToServiceSuggestions(user.id, (update) => {
          if (update.eventType === 'INSERT') {
            // New suggestion - refresh data
            fetchServiceSuggestions(user.id)
          } else if (update.eventType === 'UPDATE') {
            // Suggestion updated - refresh data
            fetchServiceSuggestions(user.id)
          }
        })
        subscriptionKeys.push(`suggestions:${user.id}`)

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
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User authentication error:', userError)
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a client
      const userRole = user.user_metadata?.role
      if (userRole !== 'client') {
        console.log('User is not a client, redirecting to main dashboard')
        router.push('/dashboard')
        return
      }

      setUser(user)
      setUserRole(userRole)
      
      // Fetch user profile for name display
      await fetchUserProfile(user.id)
      
      // Fetch data with error handling
      try {
        await Promise.all([
          fetchClientStats(user.id),
          fetchRecentBookings(user.id),
          fetchUpcomingBookings(user.id),
          fetchServiceSuggestions(user.id)
        ])
      } catch (fetchError) {
        console.error('Error fetching user data:', fetchError)
        // Continue with loading state even if some data fails
      }
    } catch (error) {
      console.error('Error loading client data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchClientStats = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get bookings count and spending
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, subtotal, currency, created_at')
        .eq('client_id', userId)

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError)
        // Set default stats if bookings can't be fetched
        setStats({
          totalBookings: 0,
          activeBookings: 0,
          completedBookings: 0,
          totalSpent: 0,
          monthlySpent: 0,
          averageRating: 0,
          totalReviews: 0,
          favoriteProviders: 0
        })
        return
      }

      const totalBookings = bookings?.length || 0
      const activeBookings = bookings?.filter(b => ['paid', 'in_progress'].includes(b.status)).length || 0
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0
      
      const totalSpent = bookings
        ?.filter(b => ['completed', 'in_progress'].includes(b.status))
        .reduce((sum, b) => {
          const subtotal = b.subtotal || 0
          const vatAmount = subtotal * 0.05 // Default 5% VAT
          return sum + subtotal + vatAmount
        }, 0) || 0

      // Get monthly spending
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyBookings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear &&
               ['completed', 'in_progress'].includes(b.status)
      }) || []
      
      const monthlySpent = monthlyBookings.reduce((sum, b) => {
        const subtotal = b.subtotal || 0
        const vatAmount = subtotal * 0.05 // Default 5% VAT
        return sum + subtotal + vatAmount
      }, 0)

      // Get ratings and reviews from the 'reviews' table (not 'service_reviews')
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('client_id', userId)

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError)
      }

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
      // Set default stats if there's an error
      setStats({
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        totalSpent: 0,
        monthlySpent: 0,
        averageRating: 0,
        totalReviews: 0,
        favoriteProviders: 0
      })
    }
  }

  const fetchRecentBookings = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          service_id,
          provider_id,
          status,
          subtotal,
          currency,
          created_at
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (bookingsError) {
        console.error('Error fetching recent bookings:', bookingsError)
        setRecentBookings([])
        return
      }

      if (!bookings || bookings.length === 0) {
        console.log('No recent bookings found')
        setRecentBookings([])
        return
      }

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
            amount: b.subtotal + (b.subtotal * 0.05) // Default 5% VAT
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
          amount: b.subtotal + (b.subtotal * 0.05)
        }))
        setRecentBookings(enrichedBookings)
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
      setRecentBookings([])
    }
  }

  const fetchUpcomingBookings = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: bookings, error: bookingsError } = await supabase
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

      if (bookingsError) {
        console.error('Error fetching upcoming bookings:', bookingsError)
        setUpcomingBookings([])
        return
      }

      if (!bookings || bookings.length === 0) {
        console.log('No upcoming bookings found')
        setUpcomingBookings([])
        return
      }

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
    } catch (error) {
      console.error('Error fetching upcoming bookings:', error)
      setUpcomingBookings([])
    }
  }

  const fetchUserProfile = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return
      }

      setUserProfile(profile)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchServiceSuggestions = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('No access token available')
        return
      }

      const response = await fetch('/api/service-suggestions?type=received&status=pending&limit=5', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Failed to fetch service suggestions:', response.statusText)
        return
      }

      const data = await response.json()
      setServiceSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Error fetching service suggestions:', error)
      setServiceSuggestions([])
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

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
      medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' }
    }
    
    const priorityConfig = config[priority as keyof typeof config] || config.medium
    return <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
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
          <p className="text-gray-600 mt-2">
            Welcome back{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}! Here's your booking overview
          </p>
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
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalSpent || 0, 'OMR')}</div>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(stats?.monthlySpent || 0, 'OMR')} this month
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
        {/* Active Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Active Bookings</span>
            </CardTitle>
            <CardDescription>Your services currently in progress</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-6">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active bookings</p>
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
                        <span className="font-medium">{formatCurrency(booking.amount, 'OMR')}</span>
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

        {/* Suggested Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Suggested Services</span>
            </CardTitle>
            <CardDescription>Services recommended by providers</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceSuggestions.length === 0 ? (
              <div className="text-center py-6">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No service suggestions yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/services')}
                >
                  Browse Services
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {serviceSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">{suggestion.suggested_service.title}</h4>
                        {getPriorityBadge(suggestion.priority)}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span>by {suggestion.provider.full_name}</span>
                        <span className="font-medium">{formatCurrency(suggestion.suggested_service.base_price, 'OMR')}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{suggestion.suggestion_reason}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/services/${suggestion.suggested_service.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/services')}
                >
                  Browse All Services
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Service Discovery */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Service Discovery</CardTitle>
          <CardDescription>Find services that match your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 border rounded-lg">
              <Search className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Browse Services</h3>
              <p className="text-gray-600 mb-4">Explore all available services</p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/services')}
              >
                Browse Services
              </Button>
            </div>
            
            <div className="text-center p-6 border rounded-lg">
              <Target className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Contact Providers</h3>
              <p className="text-gray-600 mb-4">Get personalized recommendations from providers</p>
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/messages')}
              >
                Contact Providers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
