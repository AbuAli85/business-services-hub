'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { realtimeManager } from '@/lib/realtime'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  Eye, 
  Trash2, 
  Package, 
  Star, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Settings,
  Copy,
  ExternalLink,
  User,
  Building2,
  MapPin,
  Heart,
  Share2,
  Sparkles,
  Target,
  Award,
  Zap
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Service {
  id: string
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  status: string
  approval_status: string
  cover_image_url?: string
  total_bookings: number
  total_revenue: number
  average_rating: number
  total_reviews: number
  created_at: string
  updated_at: string
  provider: {
    id: string
    full_name: string
    email: string
    phone?: string
    company_name?: string
    avatar_url?: string
  }
}

interface ServiceStats {
  totalServices: number
  activeServices: number
  pendingApproval: number
  totalBookings: number
  totalRevenue: number
  averageRating: number
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin' | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState<ServiceStats | null>(null)
  const router = useRouter()

  // Initial load when component mounts
  useEffect(() => {
    checkUserAndLoadServices()
  }, [])

  // Reload when filters change (only if we have user data)
  useEffect(() => {
    if (userRole && user?.id) {
      checkUserAndLoadServices()
    }
  }, [userRole, user?.id, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder])

  // Real-time service updates
  useEffect(() => {
    if (!user?.id) return

    let subscriptionKeys: string[] = []

    ;(async () => {
      try {
        // Subscribe to real-time service updates
        const serviceSubscription = await realtimeManager.subscribeToServices(user.id, (update) => {
          if (update.eventType === 'INSERT' || update.eventType === 'UPDATE') {
            // Refresh services and stats
            fetchServices()
            fetchServiceStats()
          }
        })
        subscriptionKeys.push(`services:${user.id}`)

      } catch (error) {
        console.error('Error setting up realtime subscriptions:', error)
      }
    })()

    return () => {
      // Unsubscribe from all channels
      subscriptionKeys.forEach(key => {
        realtimeManager.unsubscribe(key)
      })
    }
  }, [user?.id])

  const checkUserAndLoadServices = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      console.log('User authenticated:', user.id, 'Role from metadata:', user.user_metadata?.role)
      setUser(user)
      const role = user.user_metadata?.role || 'client'
      console.log('Setting user role to:', role)
      setUserRole(role)
      
      await Promise.all([
        fetchServices(),
        fetchServiceStats()
      ])
    } catch (error) {
      console.error('Error loading services:', error)
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      // Guard clause: don't fetch if we don't have user role or user ID
      if (!userRole || !user?.id) {
        console.log('fetchServices: Missing userRole or user ID, skipping')
        return
      }

      const supabase = await getSupabaseClient()
      
      // Start with a simple query to check if the basic table structure works
      let query = supabase
        .from('services')
        .select('*')

      // Role-based filtering: Providers only see their own services, clients see only approved services
      console.log('Current userRole:', userRole, 'User ID:', user?.id)
      if (userRole === 'provider' && user?.id) {
        console.log('Filtering services for provider:', user.id)
        query = query.eq('provider_id', user.id)
        
        // Double-check the query is correct
        console.log('Query after filtering for provider:', user.id)
      } else if (userRole === 'provider' && !user?.id) {
        console.log('Provider role but no user ID, skipping services fetch')
        setServices([])
        return
      } else if (userRole === 'client') {
        // Clients should only see approved services, not pending ones
        console.log('Filtering services for client - showing only approved services')
        query = query.eq('approval_status', 'approved')
      }
      // Admins can see all services (no additional filter needed)

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

             const { data: servicesData, error } = await query

       if (error) {
         console.error('Error fetching services:', error)
         toast.error('Failed to fetch services')
         setServices([])
         return
       }

       console.log(`Services fetched for ${userRole}:`, servicesData?.length || 0, 'services')
       if (servicesData && servicesData.length > 0) {
         console.log('First service provider_id:', servicesData[0].provider_id)
         console.log('First service approval_status:', servicesData[0].approval_status)
       }

      // Now try to enrich services with provider information
      const enrichedServices = await Promise.all(
        (servicesData || []).map(async (service) => {
          try {
            // Try to fetch provider information
            const { data: provider, error: providerError } = await supabase
              .from('profiles')
              .select('id, full_name, email, phone, company_name, avatar_url')
              .eq('id', service.provider_id)
              .maybeSingle() // Use maybeSingle instead of single to handle no rows

            if (providerError) {
              console.warn(`Could not fetch provider for service ${service.id}:`, providerError)
              return {
                ...service,
                provider: {
                  id: service.provider_id,
                  full_name: 'Unknown Provider',
                  email: '',
                  phone: '',
                  company_name: '',
                  avatar_url: ''
                }
              }
            }

            return {
              ...service,
              provider: provider || {
                id: service.provider_id,
                full_name: 'Unknown Provider',
                email: '',
                phone: '',
                company_name: '',
                avatar_url: ''
              }
            }
          } catch (error) {
            console.warn(`Error enriching service ${service.id}:`, error)
            return {
              ...service,
              provider: {
                id: service.provider_id,
                full_name: 'Unknown Provider',
                email: '',
                phone: '',
                company_name: '',
                avatar_url: ''
              }
            }
          }
        })
      )

      console.log('Enriched services:', enrichedServices)
      setServices(enrichedServices)
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to fetch services')
      setServices([])
    }
  }

  const fetchServiceStats = async () => {
    try {
      // Guard clause: don't fetch if we don't have user role or user ID
      if (!userRole || !user?.id) {
        console.log('fetchServiceStats: Missing userRole or user ID, skipping')
        return
      }

      const supabase = await getSupabaseClient()
      
             // Get total services count - role-based filtering
       let totalServices = 0
       if (userRole === 'provider') {
         const { count } = await supabase
           .from('services')
           .select('*', { count: 'exact', head: true })
           .eq('provider_id', user.id)
         totalServices = count || 0
       } else if (userRole === 'client') {
         // Clients only see approved services
         const { count } = await supabase
           .from('services')
           .select('*', { count: 'exact', head: true })
           .eq('approval_status', 'approved')
         totalServices = count || 0
       } else {
         // Admins see all services
         const { count } = await supabase
           .from('services')
           .select('*', { count: 'exact', head: true })
         totalServices = count || 0
       }

             // Get active services count - role-based filtering
       let activeServices = 0
       if (userRole === 'provider') {
         const { count } = await supabase
           .from('services')
           .select('*', { count: 'exact', head: true })
           .eq('provider_id', user.id)
           .eq('status', 'active')
         activeServices = count || 0
       } else if (userRole === 'client') {
         // Clients only see approved and active services
         const { count } = await supabase
           .from('services')
           .select('*', { count: 'exact', head: true })
           .eq('approval_status', 'approved')
           .eq('status', 'active')
         activeServices = count || 0
       } else {
         // Admins see all active services
         const { count } = await supabase
           .from('services')
           .select('*', { count: 'exact', head: true })
           .eq('status', 'active')
         activeServices = count || 0
       }

             // Get pending approval count - role-based filtering
       let pendingApproval = 0
       if (userRole === 'provider') {
         const { count } = await supabase
           .from('services')
           .select('*', { count: 'exact', head: true })
           .eq('provider_id', user.id)
           .eq('approval_status', 'pending')
         pendingApproval = count || 0
       } else if (userRole === 'client') {
         // Clients don't see pending services
         pendingApproval = 0
       } else {
         // Admins see all pending services
         const { count } = await supabase
           .from('services')
           .select('*', { count: 'exact', head: true })
           .eq('approval_status', 'pending')
         pendingApproval = count || 0
       }

      // Get total bookings - role-based filtering
      let totalBookings = 0
      if (userRole === 'provider') {
        // For providers, get bookings for their services only
        const { data: providerServices } = await supabase
          .from('services')
          .select('id')
          .eq('provider_id', user.id)
        
        if (providerServices && providerServices.length > 0) {
          const serviceIds = providerServices.map(s => s.id)
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .in('service_id', serviceIds)
          totalBookings = count || 0
        }
      } else {
        // For clients and admins, get all bookings
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
        totalBookings = count || 0
      }

      // Get total revenue from completed bookings - role-based filtering
      let totalRevenue = 0
      try {
        if (userRole === 'provider') {
          // For providers, only get revenue from their services
          const { data: providerServices } = await supabase
            .from('services')
            .select('id')
            .eq('provider_id', user.id)
          
          if (providerServices && providerServices.length > 0) {
            const serviceIds = providerServices.map(s => s.id)
            const { data: completedBookings } = await supabase
              .from('bookings')
              .select('subtotal, currency')
              .eq('status', 'completed')
              .in('service_id', serviceIds)
            
            if (completedBookings) {
              totalRevenue = completedBookings.reduce((sum, booking) => {
                const subtotal = booking.subtotal || 0
                const vatAmount = subtotal * 0.05 // Default 5% VAT
                const total = subtotal + vatAmount
                return sum + total
              }, 0)
            }
          }
        } else {
          // For clients and admins, get revenue from all completed bookings
          const { data: completedBookings } = await supabase
            .from('bookings')
            .select('subtotal, currency')
            .eq('status', 'completed')
          
          if (completedBookings) {
            totalRevenue = completedBookings.reduce((sum, booking) => {
              const subtotal = booking.subtotal || 0
              const vatAmount = subtotal * 0.05 // Default 5% VAT
              const total = subtotal + vatAmount
              return sum + total
            }, 0)
          }
        }
      } catch (error) {
        console.warn('Error calculating revenue from bookings:', error)
        totalRevenue = 0
      }

      // Get average rating from reviews - role-based filtering
      let averageRating = 0
      if (userRole === 'provider') {
        // For providers, get reviews for their services only
        const { data: providerServices } = await supabase
          .from('services')
          .select('id')
          .eq('provider_id', user.id)
        
        if (providerServices && providerServices.length > 0) {
          const serviceIds = providerServices.map(s => s.id)
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .in('service_id', serviceIds)
          
          averageRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            : 0
        }
      } else {
        // For clients and admins, get average rating from all reviews
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')

        averageRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
          : 0
      }

      setStats({
        totalServices: totalServices || 0,
        activeServices: activeServices || 0,
        pendingApproval: pendingApproval || 0,
        totalBookings: totalBookings || 0,
        totalRevenue,
        averageRating
      })
    } catch (error) {
      console.error('Error fetching service stats:', error)
      // Set default stats if there's an error
      setStats({
        totalServices: 0,
        activeServices: 0,
        pendingApproval: 0,
        totalBookings: 0,
        totalRevenue: 0,
        averageRating: 0
      })
    }
  }

  const getStatusBadge = (status: string, approvalStatus: string) => {
    if (approvalStatus === 'pending') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>
    }
    
    const config = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      draft: { color: 'bg-gray-100 text-gray-700', label: 'Draft' },
      inactive: { color: 'bg-red-100 text-red-800', label: 'Inactive' }
    }
    
    const statusConfig = config[status as keyof typeof config] || config.draft
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      'Digital Marketing': 'bg-blue-100 text-blue-800',
      'Legal Services': 'bg-purple-100 text-purple-800',
      'Accounting': 'bg-green-100 text-green-800',
      'IT Services': 'bg-indigo-100 text-indigo-800',
      'Design & Branding': 'bg-pink-100 text-pink-800',
      'Consulting': 'bg-orange-100 text-orange-800',
      'Translation': 'bg-teal-100 text-teal-800',
      'HR Services': 'bg-red-100 text-red-800',
      'Web Development': 'bg-cyan-100 text-cyan-800',
      'Content Creation': 'bg-amber-100 text-amber-800'
    }
    
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleServiceAction = (serviceId: string, action: string) => {
    switch (action) {
      case 'view':
        router.push(`/services/${serviceId}`)
        break
      case 'book':
        router.push(`/dashboard/bookings/create?service=${serviceId}`)
        break
      case 'contact':
        router.push(`/dashboard/messages?provider=${serviceId}`)
        break
      default:
        break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6">
          <div className="text-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-ping"></div>
            </div>
            <p className="mt-4 text-gray-600 text-lg font-medium">Loading your services...</p>
            <p className="text-gray-500 text-sm">Please wait while we prepare everything</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl opacity-10"></div>
          <div className="relative card-glass rounded-3xl p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg animate-float">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-gradient-primary">
                      {userRole === 'provider' ? 'My Services' : 'Available Services'}
                    </h1>
                    <p className="text-gray-600 mt-2 text-lg">
                      {userRole === 'provider' 
                        ? 'Manage and monitor your service offerings with professional tools' 
                        : `Discover and book premium services from verified professionals ${userRole === 'client' ? '(all services are pre-approved)' : ''}`
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {userRole === 'provider' && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/dashboard/services/manage')}
                    className="btn-secondary-gradient px-6 py-3 rounded-xl font-medium"
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    Manage Services
                  </Button>
                  <Button 
                    onClick={() => router.push('/dashboard/services/create')}
                    className="btn-primary-gradient px-6 py-3 rounded-xl font-medium"
                  >
                    <Plus className="h-5 w-4 mr-2" />
                    Create Service
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover-lift card-elevated border-0 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-blue-800">Total Services</CardTitle>
              <div className="p-2 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform duration-200 shadow-soft">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900 mb-1">{stats?.totalServices || 0}</div>
              <p className="text-xs text-blue-700 font-medium">
                {stats?.activeServices || 0} active services
              </p>
              <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500 shadow-soft" 
                  style={{ width: `${stats?.totalServices ? (stats.activeServices / stats.totalServices) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover-lift card-elevated border-0 bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-green-800">Total Bookings</CardTitle>
              <div className="p-2 bg-green-500 rounded-xl group-hover:scale-110 transition-transform duration-200 shadow-soft">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900 mb-1">{stats?.totalBookings || 0}</div>
              <p className="text-xs text-green-700 font-medium">
                {userRole === 'provider' ? 'For your services' : 'Across all services'}
              </p>
              <div className="mt-3 w-full bg-green-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500 shadow-soft" 
                  style={{ width: `${stats?.totalBookings ? Math.min((stats.totalBookings / 100) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover-lift card-elevated border-0 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-purple-800">Total Revenue</CardTitle>
              <div className="p-2 bg-purple-500 rounded-xl group-hover:scale-110 transition-transform duration-200 shadow-soft">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900 mb-1">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <p className="text-xs text-purple-700 font-medium">
                {userRole === 'provider' ? 'From your services' : 'From all services'}
              </p>
              <div className="mt-3 w-full bg-purple-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-500 shadow-soft" 
                  style={{ width: `${stats?.totalRevenue ? Math.min((stats.totalRevenue / 10000) * 100, 100) : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover-lift card-elevated border-0 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-amber-800">Average Rating</CardTitle>
              <div className="p-2 bg-amber-500 rounded-xl group-hover:scale-110 transition-transform duration-200 shadow-soft">
                <Star className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900 mb-1">{stats?.averageRating?.toFixed(1) || '0.0'}</div>
              <p className="text-xs text-amber-700 font-medium">
                {userRole === 'provider' ? 'For your services' : 'Across all services'}
              </p>
              <div className="mt-3 w-full bg-amber-200 rounded-full h-2">
                <div 
                  className="bg-amber-600 h-2 rounded-full transition-all duration-500 shadow-soft" 
                  style={{ width: `${stats?.averageRating ? (stats.averageRating / 5) * 100 : 0}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Search and Filters */}
        <Card className="card-glass border-0 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-soft">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-lg text-gray-900">Search & Filters</span>
                  <p className="text-sm text-gray-600">Find exactly what you're looking for</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary-gradient px-4 py-2 rounded-xl"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enhanced Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder={userRole === 'provider' 
                  ? "Search your services by title or description..." 
                  : "Search approved services by title or description..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 text-lg input-enhanced focus-ring-primary"
              />
            </div>

            {/* Enhanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50 rounded-2xl shadow-soft">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 input-enhanced focus-ring-primary">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-12 input-enhanced focus-ring-primary">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                    <SelectItem value="Legal Services">Legal Services</SelectItem>
                    <SelectItem value="Accounting">Accounting</SelectItem>
                    <SelectItem value="IT Services">IT Services</SelectItem>
                    <SelectItem value="Design & Branding">Design & Branding</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Translation">Translation</SelectItem>
                    <SelectItem value="HR Services">HR Services</SelectItem>
                    <SelectItem value="Web Development">Web Development</SelectItem>
                    <SelectItem value="Content Creation">Content Creation</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-12 input-enhanced focus-ring-primary">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date Created</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="base_price">Price</SelectItem>
                    <SelectItem value="average_rating">Rating</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger className="h-12 input-enhanced focus-ring-primary">
                    <SelectValue placeholder="Sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Enhanced Results Summary */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg shadow-soft">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600 font-medium">
                  {services.length} {userRole === 'provider' ? 'of your services' : 'services'} found
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setCategoryFilter('all')
                  setSortBy('created_at')
                  setSortOrder('desc')
                }}
                className="border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-200 px-4 py-2 rounded-xl"
              >
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Services Grid */}
        {services.length === 0 ? (
          <Card className="card-glass border-0 shadow-xl">
            <CardContent className="text-center py-16">
              <div className="relative">
                <div className="p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-24 h-24 mx-auto mb-6 shadow-soft">
                  <Package className="h-12 w-12 text-gray-400 mx-auto" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {userRole === 'provider' ? 'No services found' : 'No services found'}
              </h3>
              <p className="text-gray-600 mb-6 text-lg max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search criteria or filters to find what you need.'
                  : userRole === 'provider' 
                    ? 'You haven\'t created any services yet. Start building your portfolio today!'
                    : 'There are no services available at the moment. Check back soon!'}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setCategoryFilter('all')
                }}
                className="btn-secondary-gradient px-6 py-3 rounded-xl"
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <Card key={service.id} className="group hover-lift card-elevated border-0 overflow-hidden">
                {/* Enhanced Service Image */}
                <div className="aspect-video bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-t-2xl overflow-hidden relative">
                  {service.cover_image_url ? (
                    <img
                      src={service.cover_image_url}
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-20 w-20 text-white opacity-80" />
                    </div>
                  )}
                  
                  {/* Enhanced Status Badge */}
                  <div className="absolute top-4 left-4">
                    {getStatusBadge(service.status, service.approval_status)}
                  </div>

                  {/* Enhanced Action Buttons */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-10 w-10 p-0 bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={() => handleServiceAction(service.id, 'view')}
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                      {userRole === 'client' && service.status === 'active' && (
                        <Button
                          size="sm"
                          className="h-10 w-10 p-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                          onClick={() => handleServiceAction(service.id, 'book')}
                        >
                          <Plus className="h-5 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>

                <CardHeader className="pb-4">
                  <div className="space-y-3">
                    <CardTitle className="text-xl line-clamp-2 group-hover:text-blue-600 transition-colors duration-200 font-bold">
                      {service.title}
                    </CardTitle>
                    
                    <CardDescription className="line-clamp-2 text-sm text-gray-600 leading-relaxed">
                      {service.description}
                    </CardDescription>

                    <div className="flex items-center justify-between">
                      <Badge className={`${getCategoryColor(service.category)} badge-enhanced`}>
                        {service.category}
                      </Badge>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{service.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <span className="text-gray-400">({service.total_reviews || 0})</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-5">
                  {/* Enhanced Provider Info */}
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-100 shadow-soft">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {service.provider?.avatar_url ? (
                        <img
                          src={service.provider.avatar_url}
                          alt={service.provider.full_name}
                          className="h-12 w-12 rounded-2xl object-cover"
                        />
                      ) : (
                        service.provider?.full_name?.charAt(0)?.toUpperCase() || 'P'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {service.provider?.full_name || 'Unknown Provider'}
                      </p>
                      {service.provider?.company_name && (
                        <p className="text-xs text-gray-600 truncate">
                          {service.provider.company_name}
                        </p>
                      )}
                    </div>
                    <div className="p-2 bg-blue-100 rounded-xl shadow-soft">
                      <Award className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>

                  {/* Enhanced Service Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100 shadow-soft">
                      <span className="text-gray-700 font-medium">Starting from:</span>
                      <span className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        {formatCurrency(service.base_price, service.currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 p-3 bg-gray-50 rounded-xl shadow-soft">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{service.total_bookings || 0} bookings</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Oman</span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Action Buttons */}
                  <div className="flex space-x-3 pt-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 btn-secondary-gradient rounded-xl font-medium"
                      onClick={() => handleServiceAction(service.id, 'view')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    
                    {userRole === 'client' && service.status === 'active' && (
                      <Button
                        className="flex-1 h-12 btn-primary-gradient rounded-xl font-medium"
                        onClick={() => handleServiceAction(service.id, 'book')}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Book Now
                      </Button>
                    )}
                  </div>

                  {/* Enhanced Additional Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-xl px-4 py-2"
                      onClick={() => handleServiceAction(service.id, 'contact')}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Contact
                    </Button>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 rounded-xl p-2"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200 rounded-xl p-2"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 