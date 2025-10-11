'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Plus, 
  Edit, 
  Eye, 
  Package,
  Search,
  RefreshCw,
  Grid3X3,
  List,
  Star,
  Calendar,
  User,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/dashboard-data'
import { getServiceCardImageUrl } from '@/lib/service-images'
import { FallbackImage } from '@/components/ui/fallback-image'
import { getUserAuth, hasRoleV2, type UserAuthResult } from '@/lib/user-auth'
import { RoleBasedLayout } from '@/components/dashboard/role-layouts/RoleBasedLayout'
import { usePermissions } from '@/lib/permissions'

// Optimized Services Stats Component
function ServicesStats({ services, bookings }: { services: any[], bookings: any[] }) {
  const stats = useMemo(() => {
    const totalServices = services?.length || 0
    const activeServices = services?.filter(s => s.status === 'active').length || 0
    const totalBookings = bookings?.length || 0
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.totalAmount || 0), 0) || 0
    const avgRating = services?.reduce((sum, s) => sum + (s.rating || 0), 0) / Math.max(totalServices, 1) || 0

    return {
      totalServices,
      activeServices,
      totalBookings,
      totalRevenue,
      avgRating
    }
  }, [services, bookings])

  const statCards = [
    {
      title: 'Total Services',
      value: stats.totalServices,
      subtitle: `${stats.activeServices} active`,
      icon: '📦',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      subtitle: 'Across all services',
      icon: '📅',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      subtitle: `From all services`,
      icon: '💰',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Avg Rating',
      value: stats.avgRating.toFixed(1),
      subtitle: 'Across all services',
      icon: '⭐',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index} className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Optimized Service Card Component
function ServiceCard({ service, isProvider, router }: { service: any, isProvider: boolean, router: any }) {
  const imageUrl = getServiceCardImageUrl(service.cover_image_url, service.category)
  
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', text: 'Inactive' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return <Badge className={`${config.color} border-0 text-xs`}>{config.text}</Badge>
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-sm overflow-hidden">
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        <FallbackImage
          src={imageUrl}
          alt={service.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
          fallbackSrc="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop&crop=center&q=80&auto=format"
        />
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          {getStatusBadge(service.status || 'active')}
        </div>
        
        {service.featured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
              ⭐ Featured
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-6">
        {/* Service Title and Provider */}
        <div className="mb-4">
          <h3 className="font-bold text-xl mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {service.title}
          </h3>
          <div className="flex items-center text-gray-600">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mr-2">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-gray-800">
                {service.provider_name || service.providerName || 'Service Provider'}
              </span>
              <span className="text-xs text-gray-500">Service Provider</span>
            </div>
          </div>
        </div>

        {/* Service Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
          {service.description}
        </p>

        {/* Service Stats */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{service.category}</Badge>
            {(service.avg_rating || service.rating || 0) > 0 && (
              <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="text-sm font-bold text-gray-800">{(service.avg_rating || service.rating || 0).toFixed(1)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">{service.booking_count || service.bookingCount || 0} bookings</span>
            </div>
          </div>
        </div>

        {/* Price and Action */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(service.basePrice || 0, service.currency)}
            </span>
            <span className="text-xs text-gray-500 font-medium">Starting price</span>
          </div>
          
          <div className="flex gap-2">
            {isProvider && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/dashboard/services/${service.id}/edit`)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={() => router.push(`/services/${service.id}`)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Main Services Page Component
export default function ServicesPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<'provider' | 'client' | 'admin' | 'staff' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isProvider, setIsProvider] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  
  // Optimized state management
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [refreshing, setRefreshing] = useState(false)

  // Only call useDashboardData after auth is loaded
  const { services, bookings, loading, error, refresh } = useDashboardData(
    authLoading ? undefined : (userRole || undefined), 
    authLoading ? undefined : (userId || undefined)
  )
  
  // Initialize permissions
  const permissions = usePermissions(userRole, userId)
  
  // Auth initialization
  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      try {
        const authResult: UserAuthResult = await getUserAuth()
        
        if (!mounted) return
        
        if (!authResult.isAuthenticated || !authResult.user) {
          console.warn('⚠️ Services Page: User not authenticated, redirecting to login')
          setAuthLoading(false)
          // Redirect to login page
          router.push('/auth/sign-in?redirect=/dashboard/services')
          return
        }
        
        setUserId(authResult.user.id)
        setUserRole(authResult.role as 'provider' | 'client' | 'admin' | 'staff' | null)
        
        const providerCheck = await hasRoleV2('provider')
        setIsProvider(providerCheck)
        
        // Auth is loaded, now data can be fetched
        setAuthLoading(false)
        console.log('✅ Services Page: Auth loaded - userId:', authResult.user.id, 'role:', authResult.role)
      } catch (e) {
        console.error('❌ Services Page: Error getting user auth:', e)
        setAuthLoading(false)
        // Redirect to login on auth error
        if (mounted) {
          router.push('/auth/sign-in?redirect=/dashboard/services')
        }
      }
    }

    initAuth()
    
    return () => {
      mounted = false
    }
  }, [router])

  // Debug: Log when services data changes
  useEffect(() => {
    if (!authLoading && !loading) {
      console.log('📊 Services Page: Data loaded -', services?.length || 0, 'services')
      console.log('📊 Services Page: First service:', services?.[0])
    }
  }, [services, authLoading, loading])

  // Optimized refresh handler
  const handleRefresh = useCallback(async () => {
    if (refreshing) return
    
    setRefreshing(true)
    try {
      await refresh()
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setRefreshing(false)
    }
  }, [refresh, refreshing])

  // Optimized filtering and sorting
  const filteredServices = useMemo(() => {
    if (!services) return []
    
    let filtered = services.filter(service => {
      if (!service || !service.id || !service.title) return false
      
      const searchLower = (searchTerm || '').toLowerCase()
      const matchesSearch = searchTerm === '' || 
        (service.title?.toLowerCase() ?? '').includes(searchLower) ||
        (service.description?.toLowerCase() ?? '').includes(searchLower) ||
        (service.category?.toLowerCase() ?? '').includes(searchLower) ||
        (service.providerName?.toLowerCase() ?? '').includes(searchLower)
      
      const matchesStatus = statusFilter === 'all' || (service.status || 'active') === statusFilter
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
      
      return matchesSearch && matchesStatus && matchesCategory
    })

    return filtered.sort((a, b) => {
      // Sort by creation date (newest first)
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    })
  }, [services, searchTerm, statusFilter, categoryFilter])

  // Navigation handlers
  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  const handleLogout = useCallback(() => {
    // Handle logout logic here
    router.push('/auth/sign-in')
  }, [router])

  // Get unique categories
  const categories = useMemo(() => {
    if (!services) return []
    const cats = services
      .map(s => s.category)
      .filter(Boolean)
      .filter((cat, index, arr) => arr.indexOf(cat) === index)
    return cats.sort()
  }, [services])

  // Loading state
  if (authLoading || loading) {
    return (
      <RoleBasedLayout role={userRole} onNavigate={handleNavigate} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">
              {authLoading ? 'Authenticating...' : 'Loading services...'}
            </p>
          </div>
        </div>
      </RoleBasedLayout>
    )
  }
  
  // If no userId after auth loading is complete, don't render (redirect is happening)
  if (!authLoading && !userId) {
    return (
      <RoleBasedLayout role={userRole} onNavigate={handleNavigate} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Redirecting to login...</p>
          </div>
        </div>
      </RoleBasedLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <RoleBasedLayout role={userRole} onNavigate={handleNavigate} onLogout={handleLogout}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Services</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Button onClick={handleRefresh} variant="outline">Retry</Button>
              <Button onClick={() => window.location.reload()}>Reload Page</Button>
            </div>
          </div>
        </div>
      </RoleBasedLayout>
    )
  }

  return (
    <RoleBasedLayout role={userRole} onNavigate={handleNavigate} onLogout={handleLogout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
            <p className="text-gray-600 mt-1">
              Manage your services with real-time analytics
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleRefresh} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            
            {isProvider && (
              <Button 
                onClick={() => router.push('/dashboard/services/new')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Service
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <ServicesStats services={services} bookings={bookings} />

        {/* Search and Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search services, providers, or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-11">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40 h-11">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: string) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid/List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredServices.length} of {services?.length || 0} services
            </p>
          </div>

          {filteredServices.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                      ? 'Try adjusting your search or filters to find what you\'re looking for.'
                      : 'Get started by creating your first service.'}
                  </p>
                  {isProvider && (
                    <Button 
                      onClick={() => router.push('/dashboard/services/new')}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Service
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
            }>
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  isProvider={isProvider}
                  router={router}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Services for Providers */}
        {isProvider && filteredServices.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top Performing Services
              </CardTitle>
              <CardDescription>Your best performing services by bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredServices
                  .filter(service => service && service.id)
                  .sort((a, b) => (b.booking_count || b.bookingCount || 0) - (a.booking_count || a.bookingCount || 0))
                  .slice(0, 3)
                  .map((service, index) => (
                    <div key={service.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{service.title}</p>
                          <p className="text-sm text-gray-500">{service.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{service.booking_count || service.bookingCount || 0} bookings</p>
                        <p className="text-sm text-green-600">
                          {formatCurrency((service.booking_count || service.bookingCount || 0) * (service.basePrice || 0), service.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </RoleBasedLayout>
  )
}