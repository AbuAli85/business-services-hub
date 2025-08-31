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
  Share2
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

  useEffect(() => {
    checkUserAndLoadServices()
  }, [searchTerm, statusFilter, categoryFilter, sortBy, sortOrder])

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

      setUser(user)
      setUserRole(user.user_metadata?.role || 'client')
      
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
      const supabase = await getSupabaseClient()
      
      // Start with a simple query to check if the basic table structure works
      let query = supabase
        .from('services')
        .select('*')

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

      // Now try to enrich services with provider information
      const enrichedServices = await Promise.all(
        (servicesData || []).map(async (service) => {
          try {
            // Try to fetch provider information
            const { data: provider, error: providerError } = await supabase
              .from('profiles')
              .select('id, full_name, email, phone, company_name, avatar_url')
              .eq('id', service.provider_id)
              .single()

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
      const supabase = await getSupabaseClient()
      
      // Get total services count
      const { count: totalServices } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })

      // Get active services count
      const { count: activeServices } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Get pending approval count
      const { count: pendingApproval } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending')

      // Get total bookings across all services
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

      // Get total revenue from completed bookings
      // Use a safer approach that doesn't rely on specific column names
      let totalRevenue = 0
      try {
        // First try to get all completed bookings with basic info
        const { data: completedBookings, error: bookingError } = await supabase
          .from('bookings')
          .select('subtotal, vat_percent, currency')
          .eq('status', 'completed')

        if (bookingError) {
          console.warn('Could not fetch bookings for revenue calculation:', bookingError)
          totalRevenue = 0
        } else if (completedBookings) {
          totalRevenue = completedBookings.reduce((sum, booking) => {
            // Calculate total from subtotal + VAT
            const subtotal = booking.subtotal || 0
            const vatAmount = subtotal * ((booking.vat_percent || 5) / 100)
            const total = subtotal + vatAmount
            return sum + total
          }, 0)
        }
      } catch (error) {
        console.warn('Error calculating revenue from bookings:', error)
        totalRevenue = 0
      }

      // Get average rating from reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')

      const averageRating = reviews && reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0

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
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Available Services</h1>
          <p className="text-gray-600 mt-2">
            Browse and book services from professional providers {userRole === 'client' && '(including services pending approval)'}
          </p>
        </div>
        {userRole === 'provider' && (
          <Button onClick={() => router.push('/dashboard/services/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Search & Filters</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by service title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-gray-600">
              {services.length} services found
            </span>
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
            >
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {services.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'There are no services available at the moment.'}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setCategoryFilter('all')
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-all duration-200 group">
              {/* Service Image */}
              <div className="aspect-video bg-gradient-to-br from-blue-500 to-purple-600 rounded-t-lg overflow-hidden relative">
                {service.cover_image_url ? (
                  <img
                    src={service.cover_image_url}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-16 w-16 text-white opacity-80" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-3 left-3">
                  {getStatusBadge(service.status, service.approval_status)}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0"
                      onClick={() => handleServiceAction(service.id, 'view')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {userRole === 'client' && service.status === 'active' && (
                      <Button
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleServiceAction(service.id, 'book')}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <CardHeader className="pb-3">
                <div className="space-y-2">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {service.title}
                  </CardTitle>
                  
                  <CardDescription className="line-clamp-2 text-sm">
                    {service.description}
                  </CardDescription>

                  <div className="flex items-center justify-between">
                    <Badge className={getCategoryColor(service.category)}>
                      {service.category}
                    </Badge>
                    
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{service.average_rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-gray-400">({service.total_reviews || 0})</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Provider Info */}
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {service.provider?.avatar_url ? (
                      <img
                        src={service.provider.avatar_url}
                        alt={service.provider.full_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      service.provider?.full_name?.charAt(0)?.toUpperCase() || 'P'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {service.provider?.full_name || 'Unknown Provider'}
                    </p>
                    {service.provider?.company_name && (
                      <p className="text-xs text-gray-500 truncate">
                        {service.provider.company_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Service Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Starting from:</span>
                    <span className="font-semibold text-lg text-blue-600">
                      {formatCurrency(service.base_price, service.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{service.total_bookings || 0} bookings</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>Oman</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleServiceAction(service.id, 'view')}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  
                  {userRole === 'client' && service.status === 'active' && (
                    <Button
                      className="flex-1"
                      onClick={() => handleServiceAction(service.id, 'book')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Book Now
                    </Button>
                  )}
                </div>

                {/* Additional Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => handleServiceAction(service.id, 'contact')}
                  >
                    <User className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700"
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
  )
} 