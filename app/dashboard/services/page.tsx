'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
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
  ExternalLink
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

  const checkUserAndLoadServices = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a provider
      const userRole = user.user_metadata?.role
      if (userRole !== 'provider') {
        router.push('/dashboard')
        return
      }

      setUser(user)
      await loadServices(user.id)
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadServices = async (userId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // First, fetch basic service data
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', userId)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      if (error) throw error

      // Fetch statistics for each service
      const enrichedServices = await Promise.all(
        (services || []).map(async (service) => {
          try {
            console.log(`🔍 Enriching service: ${service.title} (${service.id})`)
            
            // Get booking statistics
            const { data: bookings } = await supabase
              .from('bookings')
              .select('status, amount')
              .eq('service_id', service.id)

            // Get review statistics - fetch all reviews and filter in JS to avoid 400 errors
            const { data: allReviews } = await supabase
              .from('reviews')
              .select('rating, service_id')
              
            // Filter reviews for this service
            const serviceReviews = allReviews?.filter(r => r.service_id === service.id) || []

            // Calculate statistics
            const totalBookings = bookings?.length || 0
            const totalRevenue = bookings
              ?.filter(b => ['completed', 'in_progress'].includes(b.status))
              .reduce((sum, b) => sum + (b.amount || 0), 0) || 0
            const averageRating = serviceReviews.length > 0 
              ? serviceReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / serviceReviews.length 
              : 0
            const totalReviews = serviceReviews.length || 0

            console.log(`✅ Service ${service.title} enriched:`, {
              totalBookings,
              totalRevenue,
              averageRating,
              totalReviews,
              bookingsCount: bookings?.length || 0,
              reviewsCount: serviceReviews.length
            })

            return {
              ...service,
              total_bookings: totalBookings,
              total_revenue: totalRevenue,
              average_rating: averageRating,
              total_reviews: totalReviews
            }
          } catch (error) {
            console.error(`❌ Error enriching service ${service.id}:`, error)
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

      console.log('🎯 All services enriched:', enrichedServices.length)
      setServices(enrichedServices)
      
      // Calculate overall statistics
      await fetchServiceStats(userId)
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Failed to load services')
    }
  }

  const fetchServiceStats = async (userId: string) => {
    try {
      // Use the current services state which already has calculated statistics
      if (services.length > 0) {
        const totalServices = services.length
        const activeServices = services.filter(s => s.status === 'active' && s.approval_status === 'approved').length
        const pendingApproval = services.filter(s => s.approval_status === 'pending').length
        
        // Calculate totals from the enriched services
        const totalBookings = services.reduce((sum, s) => sum + (s.total_bookings || 0), 0)
        const totalRevenue = services.reduce((sum, s) => sum + (s.total_revenue || 0), 0)
        
        // Calculate average rating from services with ratings
        const servicesWithRatings = services.filter(s => (s.average_rating || 0) > 0)
        const averageRating = servicesWithRatings.length > 0 
          ? servicesWithRatings.reduce((sum, s) => sum + (s.average_rating || 0), 0) / servicesWithRatings.length 
          : 0

        console.log('📊 Service Stats Calculated:', {
          totalServices,
          activeServices,
          pendingApproval,
          totalBookings,
          totalRevenue,
          averageRating,
          servicesCount: services.length
        })

        setStats({
          totalServices,
          activeServices,
          pendingApproval,
          totalBookings,
          totalRevenue,
          averageRating
        })
      } else {
        // If no services yet, fetch basic service count
        const supabase = await getSupabaseClient()
        const { data: basicServices } = await supabase
          .from('services')
          .select('status, approval_status')
          .eq('provider_id', userId)

        if (basicServices) {
          const totalServices = basicServices.length
          const activeServices = basicServices.filter(s => s.status === 'active' && s.approval_status === 'approved').length
          const pendingApproval = basicServices.filter(s => s.approval_status === 'pending').length

          setStats({
            totalServices,
            activeServices,
            pendingApproval,
            totalBookings: 0,
            totalRevenue: 0,
            averageRating: 0
          })
        }
      }
    } catch (error) {
      console.error('Error fetching service stats:', error)
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

      setServices(prev => prev.filter(s => s.id !== serviceId))
      toast.success('Service deleted successfully')
      
      // Refresh stats
      if (user) {
        fetchServiceStats(user.id)
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Failed to delete service')
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
          provider_id: user.id,
          status: 'draft',
          approval_status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      setServices(prev => [newService, ...prev])
      toast.success('Service duplicated successfully')
      
      // Refresh stats
      fetchServiceStats(user.id)
    } catch (error) {
      console.error('Error duplicating service:', error)
      toast.error('Failed to duplicate service')
    }
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = searchTerm === '' || 
      service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      draft: { color: 'bg-yellow-100 text-yellow-800', label: 'Draft' }
    }
    
    const statusConfig = config[status as keyof typeof config] || config.draft
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
  }

  const getApprovalBadge = (status: string) => {
    const config = {
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
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
          <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
          <p className="text-gray-600 mt-2">Manage and track your service offerings</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/dashboard/services/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Service
          </Button>
        </div>
      </div>

      {/* Service Stats */}
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
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
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
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="base_price">Price</SelectItem>
                  <SelectItem value="total_bookings">Bookings</SelectItem>
                  <SelectItem value="average_rating">Rating</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
              
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
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services List */}
      <div className="space-y-4">
        {filteredServices.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No services match your filters' : 'No services yet'}
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Create your first service to start receiving bookings.'
                }
              </p>
              <Button 
                className="mt-4"
                onClick={() => router.push('/dashboard/services/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Service
              </Button>
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
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">{service.description}</p>
                    
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
                          {formatCurrency(service.total_revenue || 0, service.currency)}
                        </div>
                        <div className="text-xs text-gray-600">Total Revenue</div>
                      </div>
                      
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          {getRatingStars(service.average_rating || 0)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {service.average_rating?.toFixed(1) || '0.0'} ({service.total_reviews || 0} reviews)
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span>Created: {formatDate(service.created_at)}</span>
                        <span>Updated: {formatDate(service.updated_at)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/services/${service.id}/analytics`)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/services/${service.id}/packages`)}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Packages
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {filteredServices.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600">Manage your services efficiently</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => router.push('/dashboard/services/create')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Service
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push('/dashboard/services/analytics')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
