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
  User
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
  provider?: {
    id: string
    full_name: string
    email: string
    phone?: string
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
  const router = useRouter()

  const [stats, setStats] = useState<ServiceStats | null>(null)

  useEffect(() => {
    checkUserAndLoadServices()
  }, [searchTerm, statusFilter, categoryFilter, sortBy])

  // Real-time service updates
  useEffect(() => {
    if (!user?.id) return

    let subscriptionKeys: string[] = []

    ;(async () => {
      try {
        // Subscribe to real-time service updates
        const serviceSubscription = await realtimeManager.subscribeToServices(user.id, (update) => {
          if (update.eventType === 'INSERT' || update.eventType === 'UPDATE' || update.eventType === 'DELETE') {
            // Service updated - refresh services
            checkUserAndLoadServices()
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

      setUser(user)
      
      // Check user role and load appropriate services
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        // Default to client if profile not found
        setUserRole('client')
        await loadServicesForClient()
        return
      }

      const role = profile.role || 'client'
      setUserRole(role)
      
      if (role === 'provider' || role === 'admin') {
        // Provider sees their own services
        await loadServicesForProvider(user.id)
      } else {
        // Client sees all available services
        await loadServicesForClient()
      }
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadServicesForProvider = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Fetch basic service data for provider
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (error) throw error

      // Enrich services with statistics
      const enrichedServices = await Promise.all(
        (services || []).map(async (service) => {
          try {
            // Get booking statistics
            const { data: bookings } = await supabase
              .from('bookings')
              .select('status, amount')
              .eq('service_id', service.id)

            // Get review statistics
            const { data: allReviews } = await supabase
              .from('reviews')
              .select('rating, booking_id')
              .eq('provider_id', service.provider_id)
            
            const { data: serviceBookings } = await supabase
              .from('bookings')
              .select('id')
              .eq('service_id', service.id)
            
            const serviceBookingIds = serviceBookings?.map(b => b.id) || []
            const serviceReviews = allReviews?.filter(r => 
              serviceBookingIds.includes(r.booking_id)
            ) || []

            const totalBookings = bookings?.length || 0
            const totalRevenue = bookings
              ?.filter(b => ['completed', 'in_progress'].includes(b.status))
              .reduce((sum, b) => sum + (b.amount || 0), 0) || 0
            const averageRating = serviceReviews.length > 0 
              ? serviceReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / serviceReviews.length 
              : 0
            const totalReviews = serviceReviews.length || 0

            return {
              ...service,
              total_bookings: totalBookings,
              total_revenue: totalRevenue,
              average_rating: averageRating,
              total_reviews: totalReviews
            }
          } catch (error) {
            console.error(`Error enriching service ${service.id}:`, error)
            return {
              ...service,
              total_bookings: 0,
              total_revenue: 0,
              average_rating: 0,
              total_reviews: 0
            }
          }
        })
      )

      setServices(enrichedServices)
      await fetchServiceStats(userId)
    } catch (error) {
      console.error('Error fetching provider services:', error)
      toast.error('Failed to load services')
    }
  }

  const loadServicesForClient = async () => {
    try {
      console.log('🔍 Loading services for client...')
      const supabase = await getSupabaseClient()
      
      // First, let's try a simple count query to see if we can access the table
      const { data: countData, error: countError } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
      
      console.log('📊 Total services count:', countData)
      console.log('❌ Count error:', countError)
      
      // Now let's try to fetch all services without any filters
      const { data: allServices, error: allError } = await supabase
        .from('services')
        .select('*')
        .limit(5)
      
      console.log('📊 All services sample:', allServices)
      console.log('❌ All services error:', allError)
      
      // Now let's try the actual filtered query
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .in('status', ['active', 'draft'])
        .order(sortBy, { ascending: sortOrder === 'asc' })

      console.log('📊 Filtered services data:', services)
      console.log('❌ Filtered services error:', error)

      if (error) throw error

      // Now let's fetch provider information separately for each service
      const enrichedServices = await Promise.all(
        (services || []).map(async (service) => {
          try {
            // Get provider information
            const { data: provider } = await supabase
              .from('profiles')
              .select('id, full_name, email, phone')
              .eq('id', service.provider_id)
              .single()

            // Get booking statistics
            const { data: bookings } = await supabase
              .from('bookings')
              .select('status, amount')
              .eq('service_id', service.id)

            // Get review statistics
            const { data: reviews } = await supabase
              .from('reviews')
              .select('rating')
              .eq('service_id', service.id)

            const totalBookings = bookings?.length || 0
            const totalRevenue = bookings
              ?.filter(b => ['completed', 'in_progress'].includes(b.status))
              .reduce((sum, b) => sum + (b.amount || 0), 0) || 0
            const averageRating = reviews && reviews.length > 0 
              ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length 
              : 0
            const totalReviews = reviews?.length || 0

            const enrichedService = {
              ...service,
              total_bookings: totalBookings,
              total_revenue: totalRevenue,
              average_rating: averageRating,
              total_reviews: totalReviews,
              provider: provider
            }

            console.log(`✨ Enriched service ${service.id}:`, enrichedService)
            return enrichedService
          } catch (error) {
            console.error(`Error enriching service ${service.id}:`, error)
            return {
              ...service,
              total_bookings: 0,
              total_revenue: 0,
              average_rating: 0,
              total_reviews: 0,
              provider: null
            }
          }
        })
      )

      console.log('✨ All enriched services:', enrichedServices)
      setServices(enrichedServices)
      await fetchServiceStatsForClient()
    } catch (error) {
      console.error('❌ Error fetching client services:', error)
      toast.error('Failed to load services')
    }
  }

  const fetchServiceStats = async (userId: string) => {
    try {
      // Use the current services state which already has calculated statistics
      if (services.length > 0) {
        const totalServices = services.length
        const activeServices = services.filter(s => s.status === 'active').length
        const pendingApproval = services.filter(s => s.approval_status === 'pending').length

        // Calculate totals from the current services state
        const totalBookings = services.reduce((sum, s) => sum + (s.total_bookings || 0), 0)
        const totalRevenue = services.reduce((sum, s) => sum + (s.total_revenue || 0), 0)
        
        // Calculate average rating from services with ratings
        const servicesWithRatings = services.filter(s => (s.average_rating || 0) > 0)
        const averageRating = servicesWithRatings.length > 0 
          ? servicesWithRatings.reduce((sum, s) => sum + (s.average_rating || 0), 0) / servicesWithRatings.length 
          : 0

        setStats({
          totalServices,
          activeServices,
          pendingApproval,
          totalBookings,
          totalRevenue,
          averageRating
        })
      }
    } catch (error) {
      console.error('Error fetching service stats:', error)
    }
  }

  const fetchServiceStatsForClient = async () => {
    try {
      // Use the current services state which already has calculated statistics
      if (services.length > 0) {
        const totalServices = services.length
        const activeServices = services.filter(s => s.status === 'active').length
        const pendingApproval = services.filter(s => s.approval_status === 'pending').length
        
        // Calculate totals from the enriched services
        const totalBookings = services.reduce((sum, s) => sum + (s.total_bookings || 0), 0)
        const totalRevenue = services.reduce((sum, s) => sum + (s.total_revenue || 0), 0)
        
        // Calculate average rating from services with ratings
        const servicesWithRatings = services.filter(s => (s.average_rating || 0) > 0)
        const averageRating = servicesWithRatings.length > 0 
          ? servicesWithRatings.reduce((sum, s) => sum + (s.average_rating || 0), 0) / servicesWithRatings.length 
          : 0

        setStats({
          totalServices,
          activeServices,
          pendingApproval,
          totalBookings,
          totalRevenue,
          averageRating
        })
      }
    } catch (error) {
      console.error('Error fetching service stats for client:', error)
    }
  }

  const handleDuplicateService = async (service: Service) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data: newService, error } = await supabase
        .from('services')
        .insert({
          title: `${service.title} (Copy)`,
          description: service.description,
          category: service.category,
          base_price: service.base_price,
          currency: service.currency,
          status: 'draft',
          approval_status: 'pending',
          provider_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Service duplicated successfully')
      
      // Refresh services
      if (userRole === 'provider') {
        await loadServicesForProvider(user.id)
      } else {
        await loadServicesForClient()
      }
    } catch (error) {
      console.error('Error duplicating service:', error)
      toast.error('Failed to duplicate service')
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error

      toast.success('Service deleted successfully')
      
      // Refresh services
      if (userRole === 'provider') {
        await loadServicesForProvider(user.id)
      } else {
        await loadServicesForClient()
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Failed to delete service')
    }
  }

  // Filter services based on search and filters
  const filteredServices = services.filter(service => {
    const matchesSearch = !searchTerm || 
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'draft':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getApprovalBadge = (approvalStatus: string) => {
    switch (approvalStatus) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{approvalStatus}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {userRole === 'provider' ? 'My Services' : 'Available Services'}
        </h1>
        <p className="text-gray-600">
          {userRole === 'provider' 
            ? 'Manage your service offerings and track performance'
            : 'Browse and book services from professional providers (including services pending approval)'
          }
        </p>
      </div>

      {/* Service Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalServices || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeServices || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              From all services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) || '0.0'}</div>
            <p className="text-xs text-muted-foreground">
              Across all services
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filters</CardTitle>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by service title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="web-development">Web Development</SelectItem>
                <SelectItem value="mobile-development">Mobile Development</SelectItem>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
                <SelectItem value="translation">Translation</SelectItem>
                <SelectItem value="PRO Services">PRO Services</SelectItem>
                <SelectItem value="IT Services">IT Services</SelectItem>
                <SelectItem value="Legal Services">Legal Services</SelectItem>
                <SelectItem value="Design & Branding">Design & Branding</SelectItem>
                <SelectItem value="Accounting">Accounting</SelectItem>
                <SelectItem value="Content Creation">Content Creation</SelectItem>
                <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                <SelectItem value="Testing">Testing</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Approval Status Filter for Clients */}
            {userRole === 'client' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Approved Services</SelectItem>
                  <SelectItem value="draft">Pending Approval</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Created Date</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="base_price">Price</SelectItem>
                    <SelectItem value="total_bookings">Bookings</SelectItem>
                    <SelectItem value="average_rating">Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sort Order</label>
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setCategoryFilter('all')
                    setSortBy('created_at')
                    setSortOrder('desc')
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Service Button for Providers */}
      {userRole === 'provider' && (
        <div className="mb-6">
          <Button 
            onClick={() => router.push('/dashboard/services/create')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Service
          </Button>
        </div>
      )}

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No services match your filters' : 'No services yet'}
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search criteria or filters.'
                  : userRole === 'provider' 
                    ? 'Create your first service to start receiving bookings.'
                    : 'No services are currently available.'
                }
              </p>
              {userRole === 'provider' && (
                <Button 
                  className="mt-4"
                  onClick={() => router.push('/dashboard/services/create')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Service
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => (
            <Card key={service.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Service Image */}
                  {service.cover_image_url && (
                    <img
                      src={service.cover_image_url}
                      alt={service.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  
                  {/* Service Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {service.title}
                        </h3>
                        <div className="flex items-center space-x-3 mb-3">
                          {getStatusBadge(service.status)}
                          {getApprovalBadge(service.approval_status)}
                          <Badge variant="outline">{service.category}</Badge>
                          {/* Show provider info for clients */}
                          {userRole === 'client' && service.provider && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {service.provider.full_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/services/${service.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        {/* Only show edit/delete actions for providers */}
                        {userRole === 'provider' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/services/${service.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDuplicateService(service)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteService(service.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {/* Show book service button for clients */}
                        {userRole === 'client' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => router.push(`/dashboard/bookings/create?service=${service.id}`)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Book Service
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                    
                    {/* Provider contact info for clients */}
                    {userRole === 'client' && service.provider && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-900">Provider Information</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Name:</span> {service.provider.full_name}
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span> {service.provider.email}
                          </div>
                          {service.provider.phone && (
                            <div>
                              <span className="text-gray-600">Phone:</span> {service.provider.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Status note for draft services */}
                    {userRole === 'client' && service.status === 'draft' && (
                      <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800">
                            This service is currently under review. You can still book it, but it may take some time to be fully approved.
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Service Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(service.base_price, service.currency)}
                        </div>
                        <div className="text-xs text-gray-600">Base Price</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {service.total_bookings || 0}
                        </div>
                        <div className="text-xs text-gray-600">Total Bookings</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {service.average_rating?.toFixed(1) || '0.0'}
                        </div>
                        <div className="text-xs text-gray-600">Rating</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {service.total_reviews || 0}
                        </div>
                        <div className="text-xs text-gray-600">Reviews</div>
                      </div>
                    </div>
                    
                    {/* Service Meta */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Created: {formatDate(service.created_at)}</span>
                        <span>Updated: {formatDate(service.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 