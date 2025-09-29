'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
  ChevronUp,
  User,
  Filter,
  ArrowUp,
  ArrowDown,
  DollarSign
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDashboardData } from '@/hooks/useDashboardData'
import { DataTable, type ColumnDef } from '@/components/dashboard/DataTable'
import { FilterDropdown } from '@/components/dashboard/FilterDropdown'
import { formatCurrency } from '@/lib/dashboard-data'
import { getServiceCardImageUrl } from '@/lib/service-images'
import { getSupabaseClient } from '@/lib/supabase'
import { getUserAuth, hasRoleV2, type UserAuthResult } from '@/lib/user-auth'

// Import new role-based components
import { AdminDashboardWidgets } from '@/components/dashboard/role-widgets/AdminDashboardWidgets'
import { ProviderDashboardWidgets } from '@/components/dashboard/role-widgets/ProviderDashboardWidgets'
import { ClientDashboardWidgets } from '@/components/dashboard/role-widgets/ClientDashboardWidgets'
import { RoleBasedLayout } from '@/components/dashboard/role-layouts/RoleBasedLayout'
import { PermissionGate, RoleBasedContent } from '@/components/dashboard/permission-components/PermissionGate'
import { ActionButton, PermissionButtonGroup } from '@/components/dashboard/permission-components/ActionButton'
import { usePermissions } from '@/lib/permissions'

export default function ServicesPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<'provider' | 'client' | 'admin' | 'staff' | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isProvider, setIsProvider] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const { services, bookings, loading, error, refresh } = useDashboardData(userRole || undefined, userId || undefined)
  
  // Initialize permissions
  const permissions = usePermissions(userRole, userId)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [ratingFilter, setRatingFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)

  // Get user role and ID using standardized auth
  useEffect(() => {
    (async () => {
      try {
        const authResult: UserAuthResult = await getUserAuth()
        
        if (!authResult.isAuthenticated || !authResult.user) {
          console.warn('User not authenticated')
          return
        }
        
        setUserId(authResult.user.id)
        setUserRole(authResult.role as 'provider' | 'client' | 'admin' | 'staff' | null)
        
        // Check specific roles using the new efficient function
        const [adminCheck, providerCheck, clientCheck] = await Promise.all([
          hasRoleV2('admin'),
          hasRoleV2('provider'),
          hasRoleV2('client')
        ])
        
        setIsAdmin(adminCheck)
        setIsProvider(providerCheck)
        setIsClient(clientCheck)
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('User auth result:', {
            userId: authResult.user.id,
            role: authResult.role,
            hasProfile: !!authResult.profile,
            profileName: authResult.profile?.full_name,
            isAdmin: adminCheck,
            isProvider: providerCheck,
            isClient: clientCheck
          })
        }
      } catch (e) {
        console.error('Error getting user auth:', e)
      }
    })()
  }, [])

  // Use the services state directly from API
  const sourceServices = services || []

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Services data:', sourceServices)
      console.log('User role:', userRole)
      console.log('User ID:', userId)
    }
  }, [sourceServices, userRole, userId])


  // Filter and sort services
  const filteredServices = useMemo(() => {
    let filtered = sourceServices.filter(service => {
      const matchesSearch = searchTerm === '' || 
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.providerName.toLowerCase().includes(searchTerm.toLowerCase())
      
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
      
      const matchesFeatured = !featuredOnly || service.featured
      
      return matchesSearch && matchesStatus && matchesCategory && matchesPrice && matchesRating && matchesFeatured
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
  }, [sourceServices, searchTerm, statusFilter, categoryFilter, sortBy, sortOrder, priceRange, ratingFilter, featuredOnly])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = sourceServices.length
    const active = sourceServices.filter(s => (s.status || 'active') === 'active').length
    const pending = sourceServices.filter(s => (s.status || 'inactive') === 'inactive').length
    // For clients, show only their own bookings; for providers, show bookings per own services (already filtered above)
    const totalBookings = bookings.filter((b:any) => {
      if (userRole === 'client') return b.clientId === undefined ? (b.client_id === undefined ? false : b.client_id === (b.user_id || b.client_id)) : b.clientId === (b.user_id || b.clientId)
      if (isProvider) return true
      return true
    }).length
    const totalRevenue = isProvider 
      ? sourceServices.reduce((sum, s) => sum + ((s.booking_count || s.bookingCount || 0) * (s.basePrice || 0)), 0)
      : 0 // Revenue hidden for clients
    const avgRating = sourceServices.length > 0 
      ? sourceServices.reduce((sum, s) => sum + (s.avg_rating || s.rating || 0), 0) / sourceServices.length 
      : 0

    return { total, active, pending, totalBookings, totalRevenue, avgRating }
  }, [sourceServices, bookings, userRole])

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(sourceServices.map((s: any) => s.category).filter(Boolean))
    return Array.from(uniqueCategories).sort()
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


  if (loading) {
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
    <RoleBasedLayout
      role={userRole}
      onNavigate={(path) => router.push(path)}
      onLogout={() => router.push('/auth/signout')}
      notifications={0}
    >
      <div className="space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{isProvider ? 'My Services' : 'Services'}</h1>
            <p className="text-blue-100 text-lg mb-4">{isProvider ? 'Manage your services and bookings' : 'Browse available services and book what you need'}</p>
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
              {(isProvider || isAdmin) && (
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>Revenue: {formatCurrency(stats.totalRevenue)}</span>
                </div>
              )}
              {isProvider && (
                <div className="flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  <span>Avg Rating: {stats.avgRating.toFixed(1)}</span>
                </div>
              )}
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
            {isProvider && (
              <Button 
                variant="secondary"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => router.push('/dashboard/services/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Service
              </Button>
            )}
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
        {(isProvider || isAdmin) && (
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
        )}
      </div>


      {/* Enhanced Search and Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Main Search and Controls */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services, providers, or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 text-base"
                />
              </div>
              
              <div className="flex gap-2">
                <FilterDropdown
                  label="Status"
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'Active', value: 'active' },
                    { label: 'Pending', value: 'pending' },
                    { label: 'Inactive', value: 'inactive' },
                    { label: 'Suspended', value: 'suspended' },
                  ]}
                  value={statusFilter}
                  onChange={(v) => setStatusFilter((v as string) || 'all')}
                  className="h-11"
                />
                <FilterDropdown
                  label="Category"
                  options={[{ label: 'All', value: 'all' }, ...categories.map((c:string) => ({ label: c, value: c }))]}
                  value={categoryFilter}
                  onChange={(v) => setCategoryFilter((v as string) || 'all')}
                  className="h-11"
                />
                <FilterDropdown
                  label="Rating"
                  options={[
                    { label: 'All', value: 'all' },
                    { label: '5★', value: '5' },
                    { label: '4+★', value: '4' },
                    { label: '3+★', value: '3' },
                    { label: '2+★', value: '2' },
                    { label: '1+★', value: '1' },
                  ]}
                  value={ratingFilter}
                  onChange={(v) => setRatingFilter((v as string) || 'all')}
                  className="h-11"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-11 px-4"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                  {showFilters && <Badge variant="secondary" className="ml-2">Active</Badge>}
                </Button>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48 h-11">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Newest First</SelectItem>
                    <SelectItem value="title">Title A-Z</SelectItem>
                    <SelectItem value="base_price">Price Low-High</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="booking_count">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-11 px-3"
                >
                  {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
                
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none h-11"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none h-11"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="bg-gray-50 p-6 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Category</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Price Range (OMR)</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                        type="number"
                        className="h-10"
                      />
                      <Input
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                        type="number"
                        className="h-10"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Rating</Label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Ratings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
                        <SelectItem value="4">4+ Stars</SelectItem>
                        <SelectItem value="3">3+ Stars</SelectItem>
                        <SelectItem value="2">2+ Stars</SelectItem>
                        <SelectItem value="1">1+ Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="featured"
                        checked={featuredOnly}
                        onCheckedChange={(checked) => setFeaturedOnly(checked as boolean)}
                      />
                      <Label htmlFor="featured" className="text-sm">Featured Services Only</Label>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('all')
                      setCategoryFilter('all')
                      setPriceRange({ min: '', max: '' })
                      setRatingFilter('all')
                      setFeaturedOnly(false)
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Services Grid/List or Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredServices.length > 0 ? (
        viewMode === 'list' ? (
          <DataTable
            columns={[
              { key: 'title', header: 'Title', sortable: true, render: (s:any) => (
                <div className="flex flex-col">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-xs text-slate-500">{s.provider_name || s.providerName}</span>
                </div>
              ) },
              { key: 'category', header: 'Category', sortable: true },
              { key: 'basePrice', header: 'Price', sortable: true, render: (s:any) => formatCurrency(s.basePrice || 0, s.currency) },
              { key: 'rating', header: 'Rating', sortable: true, render: (s:any) => (s.avg_rating || s.rating || 0).toFixed(1) },
              { key: 'bookingCount', header: 'Bookings', sortable: true, render: (s:any) => s.booking_count || s.bookingCount || 0 },
              { key: 'status', header: 'Status', render: (s:any) => getStatusBadge(s.status || 'active') },
              { key: 'actions', header: 'Actions', render: (s:any) => (
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/services/${s.id}/edit`)}>Edit</Button>
                  <Button size="sm" onClick={() => router.push(`/dashboard/bookings/create?service=${s.id}`)}>Book</Button>
                </div>
              ) }
            ]}
            data={filteredServices}
            onSortChange={(key, dir) => {
              setSortBy(key as any)
              setSortOrder(dir)
            }}
            sortKey={sortBy}
            sortDirection={sortOrder}
            page={1}
            pageSize={filteredServices.length}
            total={filteredServices.length}
          />
        ) : (
        <div className={'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {filteredServices.map((service) => (
            <Card key={service.id} className="group hover:shadow-2xl transition-all duration-300 border-0 shadow-lg bg-white overflow-hidden rounded-2xl hover:-translate-y-1">
              {/* Service Image Header */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={getServiceCardImageUrl(service.category, service.title, (service as any).cover_image_url, 400, 200)}
                  alt={`${service.title} - ${service.category} service`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Status and Featured Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  <Badge className={`px-3 py-1 text-xs font-semibold rounded-full shadow-md ${
                    service.status === 'active' 
                      ? 'bg-emerald-500 text-white border-0' 
                      : 'bg-gray-500 text-white border-0'
                  }`}>
                    {service.status === 'active' ? '✓ Active' : service.status}
                  </Badge>
                  {service.featured && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 px-3 py-1 text-xs font-semibold rounded-full shadow-md">
                      ⭐ Featured
                    </Badge>
                  )}
                </div>
                
                {/* View Button */}
                <div className="absolute top-3 right-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 rounded-full bg-white/90 hover:bg-white shadow-md hover:shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                    onClick={() => router.push(`/services/${service.id}`)}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
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
                      <span className="text-xs text-gray-500">Provider</span>
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
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                        <Package className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{service.category}</span>
                    </div>
                    {(service.avg_rating || service.rating || 0) > 0 && (
                      <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-full">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-sm font-bold text-gray-800">{(service.avg_rating || service.rating || 0).toFixed(1)}</span>
                        <span className="text-xs text-gray-500">({service.review_count || service.reviewCount || 0})</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-600">{service.booking_count || service.bookingCount || 0} bookings</span>
                      </div>
                      {isProvider && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 font-medium">
                            {formatCurrency((service.booking_count || service.bookingCount || 0) * (service.basePrice || 0), service.currency)}
                          </span>
                        </div>
                      )}
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
                  <PermissionButtonGroup userRole={userRole} userId={userId}>
                    <PermissionGate 
                      permission="services:update" 
                      userRole={userRole} 
                      userId={userId}
                      showError={false}
                    >
                      <ActionButton
                        permission="services:update"
                        userRole={userRole}
                        userId={userId}
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/services/${service.id}/edit`)}
                        className="flex items-center px-3 py-1.5 rounded-md border-2 hover:bg-indigo-50 hover:border-indigo-300 transition-all duration-200 font-medium text-xs"
                        tooltip="Edit Service"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </ActionButton>
                    </PermissionGate>

                    <PermissionGate 
                      permission="services:update" 
                      userRole={userRole} 
                      userId={userId}
                      showError={false}
                    >
                      <ActionButton
                        permission="services:update"
                        userRole={userRole}
                        userId={userId}
                        variant={service.status === 'active' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => {
                          // Toggle service status
                          const newStatus = service.status === 'active' ? 'inactive' : 'active'
                          // TODO: Implement status update API call
                          console.log(`Toggle service ${service.id} status to ${newStatus}`)
                        }}
                        className={`px-3 py-1.5 rounded-md font-medium transition-all duration-200 text-xs ${
                          service.status === 'active' 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                        tooltip={service.status === 'active' ? 'Deactivate Service' : 'Activate Service'}
                      >
                        {service.status === 'active' ? 'Deactivate' : 'Activate'}
                      </ActionButton>
                    </PermissionGate>

                    <PermissionGate 
                      permission="bookings:create" 
                      userRole={userRole} 
                      userId={userId}
                      showError={false}
                    >
                      <ActionButton
                        permission="bookings:create"
                        userRole={userRole}
                        userId={userId}
                        className="flex items-center px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={() => router.push(`/dashboard/bookings/create?service=${service.id}`)}
                        tooltip="Book this service"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Book Now
                      </ActionButton>
                    </PermissionGate>
                  </PermissionButtonGroup>
                </div>
                
                {/* Service Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>Created {new Date(service.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Updated {new Date(service.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {loading ? 'Loading services...' : 'No services found'}
            </h3>
            <p className="text-gray-600 mb-4">
              {loading 
                ? 'Please wait while we load your services...'
                : searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters to see more services.'
                  : isProvider 
                    ? 'Services will appear here when you create them. Click "Create Service" to get started!' 
                    : 'No active services available at the moment.'}
            </p>
            {isProvider ? (
              <Button onClick={() => router.push('/dashboard/services/create')} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Service
              </Button>
            ) : (
              <Button onClick={() => router.push('/services')} variant="outline">
                Browse Services
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Provider Service Performance Insights */}
      {isProvider && filteredServices.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Service Performance Insights</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                  Top Performing Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredServices
                    .sort((a, b) => (b.booking_count || b.bookingCount || 0) - (a.booking_count || a.bookingCount || 0))
                    .slice(0, 3)
                    .map((service, index) => (
                      <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{service.title}</p>
                            <p className="text-sm text-gray-500">
                              {service.category} • {service.provider_name || service.providerName || 'Service Provider'}
                            </p>
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

            {/* Service Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                  Service Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Active Services</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{stats.active}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Inactive Services</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full" 
                          style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{stats.pending}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Average Rating</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-bold text-gray-900">{stats.avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      </div>
    </RoleBasedLayout>
  )
}
