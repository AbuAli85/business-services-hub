'use client'

import { useState, useMemo, useEffect } from 'react'
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
  Star, 
  Clock, 
  Banknote, 
  TrendingUp, 
  Calendar,
  Search,
  CheckCircle,
  RefreshCw,
  Grid3X3,
  List,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatCurrency } from '@/lib/dashboard-data'
import { getServiceCardImageUrl } from '@/lib/service-images'
import { getSupabaseClient } from '@/lib/supabase'

export default function ServicesPage() {
  const router = useRouter()
  const { services, bookings, loading, error, refresh } = useDashboardData()
  const [providerServices, setProviderServices] = useState<any[]>([])
  const [providerLoading, setProviderLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [ratingFilter, setRatingFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Load provider-owned services from API if user is a provider
  useEffect(() => {
    (async () => {
      try {
        setProviderLoading(true)
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setProviderServices([])
          setProviderLoading(false)
          return
        }
        // 1) Try direct provider_id query
        const params1 = new URLSearchParams({ provider_id: user.id, limit: '200', page: '1' })
        let res = await fetch(`/api/services?${params1.toString()}`, { cache: 'no-store' })
        let list: any[] = []
        if (res.ok) {
          const json = await res.json()
          list = json.services || []
        }
        // 2) If empty (possible RLS/provider_id mismatch), fetch all then filter by current user
        if (list.length === 0) {
          const params2 = new URLSearchParams({ limit: '200', page: '1' })
          res = await fetch(`/api/services?${params2.toString()}`, { cache: 'no-store' })
          if (res.ok) {
            const jsonAll = await res.json()
            const all: any[] = jsonAll.services || []
            list = all.filter((s: any) => s.provider_id === user.id || s?.provider?.email === user.email)
          }
        }

        const mapped = (list || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description || '',
          category: s.category || 'Uncategorized',
          basePrice: s.base_price ?? 0,
          currency: s.currency || 'OMR',
          providerId: s.provider_id,
          providerName: s.provider?.full_name || 'Service Provider',
          status: s.status || 'active',
          rating: s.rating || 0,
          bookingCount: s.bookings_count || 0,
          createdAt: s.created_at || new Date().toISOString(),
          cover_image_url: s.cover_image_url,
        }))
        setProviderServices(mapped)
      } catch (e) {
        // On failure, do not show mock; prefer empty state for accuracy
        setProviderServices([])
      } finally {
        setProviderLoading(false)
      }
    })()
  }, [])

  // For provider view, prefer providerServices. If none, show empty state (not mock).
  const sourceServices = providerServices.length > 0 ? providerServices : []

  // Filter and sort services
  const filteredServices = useMemo(() => {
    let filtered = sourceServices.filter(service => {
      const matchesSearch = searchTerm === '' || 
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || (service.status || 'active') === statusFilter
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
      
      const matchesPrice = (() => {
        if (!priceRange.min && !priceRange.max) return true
        const price = service.basePrice
        const min = priceRange.min ? parseFloat(priceRange.min) : 0
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity
        return price >= min && price <= max
      })()
      
      const matchesRating = (() => {
        if (ratingFilter === 'all') return true
        const rating = service.rating || 0
        switch (ratingFilter) {
          case '5': return rating >= 5
          case '4': return rating >= 4 && rating < 5
          case '3': return rating >= 3 && rating < 4
          case '2': return rating >= 2 && rating < 3
          case '1': return rating >= 1 && rating < 2
          default: return true
        }
      })()
      
      return matchesSearch && matchesStatus && matchesCategory && matchesPrice && matchesRating
    })

    // Sort services
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'base_price':
          aValue = a.basePrice
          bValue = b.basePrice
          break
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'rating':
          aValue = a.rating || 0
          bValue = b.rating || 0
          break
        case 'booking_count':
          aValue = a.bookingCount || 0
          bValue = b.bookingCount || 0
          break
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [services, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder, priceRange, ratingFilter])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = sourceServices.length
    const active = sourceServices.filter(s => (s.status || 'active') === 'active').length
    const pending = sourceServices.filter(s => (s.status || 'inactive') === 'inactive').length
    const totalBookings = bookings.length
    const totalRevenue = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.totalAmount, 0)
    const avgRating = sourceServices.length > 0 
      ? sourceServices.reduce((sum, s) => sum + (s.rating || 0), 0) / sourceServices.length 
      : 0

    return { total, active, pending, totalBookings, totalRevenue, avgRating }
  }, [sourceServices, bookings])

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(sourceServices.map((s: any) => s.category))).sort()
  }, [sourceServices])

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', className: 'text-green-600 border-green-200 bg-green-50' },
      pending: { label: 'Pending', className: 'text-yellow-600 border-yellow-200 bg-yellow-50' },
      inactive: { label: 'Inactive', className: 'text-gray-600 border-gray-200 bg-gray-50' },
      suspended: { label: 'Suspended', className: 'text-red-600 border-red-200 bg-red-50' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  if (loading || providerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading services</p>
          <Button onClick={refresh}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Services Management</h1>
            <p className="text-blue-100 text-lg mb-4">
              Manage and track all services with real-time booking and revenue data
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Package className="h-4 w-4 mr-1" />
                <span>Total: {stats.total} services</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Active: {stats.active}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Bookings: {stats.totalBookings}</span>
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Revenue: {formatCurrency(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={refresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => router.push('/dashboard/services/create')}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Service
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Services</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active Services</p>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-green-600">
                  {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}% active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Date Created</SelectItem>
                <SelectItem value="base_price">Price</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="booking_count">Bookings</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid/List */}
      {filteredServices.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredServices.map((service) => (
            <Card key={service.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={getServiceCardImageUrl(service.category, service.title, (service as any).cover_image_url, 64, 64)}
                        alt={`${service.title} - ${service.category} service`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-lg">{service.title}</h3>
                        {getStatusBadge(service.status)}
                      </div>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">{service.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Package className="h-3 w-3 mr-1" />
                          {service.category}
                        </span>
                        <span className="flex items-center">
                          <Banknote className="h-3 w-3 mr-1" />
                          {formatCurrency(service.basePrice, service.currency)}
                        </span>
                        {service.rating && (
                          <span className="flex items-center">
                            <Star className="h-3 w-3 mr-1 text-yellow-500" />
                            {service.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/services/${service.id}`)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/services/${service.id}/edit`)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {service.bookingCount || 0} bookings
                    </span>
                    <span className="flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {formatCurrency((service.bookingCount || 0) * service.basePrice, service.currency)} revenue
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Created {new Date(service.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters to see more services.'
                : 'Services will appear here when created.'}
            </p>
            <Button onClick={() => router.push('/dashboard/services/create')} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Service
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
