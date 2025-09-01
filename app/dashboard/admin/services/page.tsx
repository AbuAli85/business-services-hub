'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle,
  XCircle,
  Clock,
  Star,
  DollarSign,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  TrendingUp,
  Download,
  Upload,
  Settings
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface Service {
  id: string
  title: string
  description: string
  category: string
  status: 'active' | 'inactive' | 'pending' | 'rejected' | 'featured'
  price: number
  currency: string
  provider_id: string
  provider_name: string
  provider_company?: string
  created_at: string
  updated_at: string
  rating?: number
  review_count?: number
  booking_count?: number
  is_featured: boolean
  tags: string[]
}

interface ServiceStats {
  total: number
  active: number
  pending: number
  rejected: number
  featured: number
  total_revenue: number
  average_rating: number
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [stats, setStats] = useState<ServiceStats>({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    featured: 0,
    total_revenue: 0,
    average_rating: 0
  })

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    filterServices()
  }, [services, searchQuery, statusFilter, categoryFilter])

  const loadServices = async () => {
    try {
      // Mock data for demonstration
      const mockServices: Service[] = [
        {
          id: '1',
          title: 'Website Development',
          description: 'Professional website development with modern design',
          category: 'web-development',
          status: 'pending',
          price: 500,
          currency: 'OMR',
          provider_id: '2',
          provider_name: 'Fahad Alamri',
          provider_company: 'Digital Solutions',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          rating: 4.8,
          review_count: 15,
          booking_count: 8,
          is_featured: false,
          tags: ['web', 'development', 'responsive']
        },
        {
          id: '2',
          title: 'Digital Marketing',
          description: 'Comprehensive digital marketing services',
          category: 'marketing',
          status: 'active',
          price: 300,
          currency: 'OMR',
          provider_id: '2',
          provider_name: 'Fahad Alamri',
          provider_company: 'Digital Solutions',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          updated_at: new Date(Date.now() - 7200000).toISOString(),
          rating: 4.6,
          review_count: 22,
          booking_count: 12,
          is_featured: true,
          tags: ['marketing', 'seo', 'social-media']
        },
        {
          id: '3',
          title: 'Mobile App Development',
          description: 'iOS and Android app development',
          category: 'mobile-development',
          status: 'active',
          price: 800,
          currency: 'OMR',
          provider_id: '4',
          provider_name: 'Sarah Johnson',
          provider_company: 'Tech Innovations',
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
          updated_at: new Date(Date.now() - 1800000).toISOString(),
          rating: 4.9,
          review_count: 8,
          booking_count: 5,
          is_featured: false,
          tags: ['mobile', 'app', 'ios', 'android']
        },
        {
          id: '4',
          title: 'Graphic Design',
          description: 'Professional graphic design services',
          category: 'design',
          status: 'rejected',
          price: 150,
          currency: 'OMR',
          provider_id: '5',
          provider_name: 'Mike Chen',
          provider_company: 'Creative Studio',
          created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
          updated_at: new Date(Date.now() - 900000).toISOString(),
          rating: 0,
          review_count: 0,
          booking_count: 0,
          is_featured: false,
          tags: ['design', 'graphics', 'logo']
        }
      ]

      setServices(mockServices)
      
      // Calculate stats
      const total = mockServices.length
      const active = mockServices.filter(s => s.status === 'active').length
      const pending = mockServices.filter(s => s.status === 'pending').length
      const rejected = mockServices.filter(s => s.status === 'rejected').length
      const featured = mockServices.filter(s => s.is_featured).length
      const total_revenue = mockServices.reduce((sum, s) => sum + (s.price * (s.booking_count || 0)), 0)
      const average_rating = mockServices.reduce((sum, s) => sum + (s.rating || 0), 0) / mockServices.length

      setStats({
        total,
        active,
        pending,
        rejected,
        featured,
        total_revenue,
        average_rating
      })

      setLoading(false)
    } catch (error) {
      console.error('Error loading services:', error)
      setLoading(false)
    }
  }

  const filterServices = () => {
    let filtered = services

    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.provider_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.status === statusFilter)
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(service => service.category === categoryFilter)
    }

    setFilteredServices(filtered)
  }

  const handleBulkAction = (action: string) => {
    if (selectedServices.length === 0) {
      toast.error('Please select services first')
      return
    }

    switch (action) {
      case 'approve':
        setServices(services.map(service =>
          selectedServices.includes(service.id)
            ? { ...service, status: 'active' as const }
            : service
        ))
        toast.success(`${selectedServices.length} services approved`)
        break
      case 'reject':
        setServices(services.map(service =>
          selectedServices.includes(service.id)
            ? { ...service, status: 'rejected' as const }
            : service
        ))
        toast.success(`${selectedServices.length} services rejected`)
        break
      case 'feature':
        setServices(services.map(service =>
          selectedServices.includes(service.id)
            ? { ...service, is_featured: true }
            : service
        ))
        toast.success(`${selectedServices.length} services featured`)
        break
      case 'unfeature':
        setServices(services.map(service =>
          selectedServices.includes(service.id)
            ? { ...service, is_featured: false }
            : service
        ))
        toast.success(`${selectedServices.length} services unfeatured`)
        break
      case 'delete':
        setServices(services.filter(service => !selectedServices.includes(service.id)))
        toast.success(`${selectedServices.length} services deleted`)
        break
    }

    setSelectedServices([])
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'web-development': return 'bg-blue-100 text-blue-800'
      case 'marketing': return 'bg-purple-100 text-purple-800'
      case 'mobile-development': return 'bg-green-100 text-green-800'
      case 'design': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Service Management</h1>
            <p className="text-emerald-100 text-lg mb-4">
              Manage and moderate all platform services with full administrative control
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Package className="h-4 w-4 mr-1" />
                <span>Total: {stats.total}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Active: {stats.active}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Pending: {stats.pending}</span>
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1" />
                <span>Featured: {stats.featured}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All platform services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">OMR {stats.total_revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From all services
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2 text-blue-600" />
            Search & Filters
          </CardTitle>
          <CardDescription>
            Find and manage services with advanced filtering options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Search Services</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Title, description, provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="web-development">Web Development</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="mobile-development">Mobile Development</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Bulk Actions</label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkAction('approve')}
                  className="flex-1"
                >
                  Approve
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleBulkAction('feature')}
                  className="flex-1"
                >
                  Feature
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            Manage platform services and their approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No services found</p>
              <p className="text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-6 border-2 rounded-xl hover:border-emerald-200 hover:bg-emerald-50/30 transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-6">
                    <Checkbox
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedServices([...selectedServices, service.id])
                        } else {
                          setSelectedServices(selectedServices.filter(id => id !== service.id))
                        }
                      }}
                    />
                    
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center border-2 border-white shadow-lg">
                      <Package className="h-8 w-8 text-emerald-600" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-semibold text-gray-900 text-lg">{service.title}</h4>
                        {service.is_featured && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 max-w-md">{service.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {service.provider_name}
                        </div>
                        {service.provider_company && (
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            {service.provider_company}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(service.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge className={`${getStatusColor(service.status)} font-medium`}>
                          {service.status.toUpperCase()}
                        </Badge>
                        <Badge className={`${getCategoryColor(service.category)} font-medium`}>
                          {service.category.replace('-', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {service.currency} {service.price}
                        </Badge>
                        {service.rating && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                            <Star className="h-3 w-3 mr-1" />
                            {service.rating} ({service.review_count})
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {service.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700"
                        onClick={() => handleBulkAction('approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
