'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Search, Filter, Plus, Edit, Trash2, Eye, Building2, TrendingUp, 
  Calendar, DollarSign, Star, Zap, Clock, Activity, FileCheck, AlertCircle,
  Target, Play, Download, ExternalLink, Share2, Award, Lightbulb, BookOpen,
  Headphones, HelpCircle, CreditCard, Receipt, CheckCircle, FileText, RefreshCw
} from 'lucide-react'

interface Service {
  id: string
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  status: string
  cover_image_url?: string
  created_at: string
  updated_at?: string
  views_count?: number
  bookings_count?: number
  rating?: number
  tags?: string[]
  delivery_timeframe?: string
  revision_policy?: string
  service_packages?: {
    name: string;
    price: number;
    delivery_days: number;
    revisions: number;
  }[];
}

interface ServiceStats {
  totalServices: number
  activeServices: number
  totalRevenue: number
  averageRating: number
  totalViews: number
  totalBookings: number
}

interface Contract {
  id: string
  title: string
  clientName: string
  amount: number
  status: string
  dueDate: string
  actionRequired: string
}

interface SupportTicket {
  id: string
  title: string
  priority: string
  status: string
  category: string
  createdAt: string
  lastUpdated: string
}

interface Resource {
  id: string
  title: string
  type: string
  description: string
  url: string
  category: string
}

interface Referral {
  id: string
  clientName: string
  status: string
  commission: number
  date: string
}

export default function ProviderServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedView, setSelectedView] = useState('grid')
  const [activeTab, setActiveTab] = useState('services')
  const [stats, setStats] = useState<ServiceStats>({
    totalServices: 0,
    activeServices: 0,
    totalRevenue: 0,
    averageRating: 0,
    totalViews: 0,
    totalBookings: 0
  })

  const categories = [
    'Digital Marketing',
    'Legal Services',
    'Accounting',
    'IT Services',
    'Design & Branding',
    'Consulting',
    'Translation',
    'HR Services',
    'Web Development',
    'Content Creation',
    'Financial Services',
    'Healthcare Services',
    'Education & Training',
    'Real Estate',
    'Manufacturing'
  ]

  const statuses = ['active', 'inactive', 'draft', 'pending', 'featured']
  
  // Mock data for additional sections
  const [contracts] = useState<Contract[]>([
    {
      id: '1',
      title: 'Website Development Contract',
      clientName: 'ABC Company',
      amount: 2500,
      status: 'pending_signature',
      dueDate: '2024-01-15',
      actionRequired: 'Client signature required'
    },
    {
      id: '2',
      title: 'Marketing Campaign',
      clientName: 'XYZ Corp',
      amount: 1800,
      status: 'active',
      dueDate: '2024-01-30',
      actionRequired: 'Invoice due'
    }
  ])
  
  const [supportTickets] = useState<SupportTicket[]>([
    {
      id: '1',
      title: 'Payment processing issue',
      priority: 'high',
      status: 'open',
      category: 'Billing',
      createdAt: '2024-01-10',
      lastUpdated: '2024-01-12'
    },
    {
      id: '2',
      title: 'Service delivery question',
      priority: 'medium',
      status: 'in_progress',
      category: 'Service',
      createdAt: '2024-01-08',
      lastUpdated: '2024-01-11'
    }
  ])
  
  const [resources] = useState<Resource[]>([
    {
      id: '1',
      title: 'Provider Onboarding Guide',
      type: 'PDF',
      description: 'Complete guide to getting started as a provider',
      url: '#',
      category: 'Onboarding'
    },
    {
      id: '2',
      title: 'Service Creation Best Practices',
      type: 'Video',
      description: 'Learn how to create compelling service descriptions',
      url: '#',
      category: 'Service Management'
    },
    {
      id: '3',
      title: 'Client Communication Playbook',
      type: 'Document',
      description: 'Effective communication strategies with clients',
      url: '#',
      category: 'Client Relations'
    }
  ])
  
  const [referrals] = useState<Referral[]>([
    {
      id: '1',
      clientName: 'John Smith',
      status: 'completed',
      commission: 150,
      date: '2024-01-05'
    },
    {
      id: '2',
      clientName: 'Sarah Johnson',
      status: 'pending',
      commission: 200,
      date: '2024-01-08'
    }
  ])

  useEffect(() => {
    fetchMyServices()
    fetchServiceStats()
  }, [searchQuery, selectedCategory, selectedStatus])

  const fetchMyServices = async () => {
    setLoading(true)
    
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error('No authenticated user')
        return
      }

      let query = supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id)

      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      if (selectedStatus && selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus)
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data: servicesData, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching services:', error)
        return
      }

      console.log('My services data:', servicesData)
      setServices(servicesData || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServiceStats = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id)

      if (servicesData) {
        const totalServices = servicesData.length
        const activeServices = servicesData.filter(s => s.status === 'active').length
        const totalRevenue = servicesData.reduce((sum, s) => sum + (s.base_price || 0), 0)
        const totalViews = servicesData.reduce((sum, s) => sum + (s.views_count || 0), 0)
        const totalBookings = servicesData.reduce((sum, s) => sum + (s.bookings_count || 0), 0)
        const averageRating = servicesData.length > 0 
          ? servicesData.reduce((sum, s) => sum + (s.rating || 0), 0) / servicesData.length 
          : 0

        setStats({
          totalServices,
          activeServices,
          totalRevenue,
          averageRating,
          totalViews,
          totalBookings
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchMyServices()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedStatus('all')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200'
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'featured': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Zap className="h-3 w-3" />
      case 'inactive': return <Activity className="h-3 w-3" />
      case 'draft': return <Edit className="h-3 w-3" />
      case 'pending': return <Clock className="h-3 w-3" />
      case 'featured': return <Star className="h-3 w-3" />
      default: return <Activity className="h-3 w-3" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }



  const handleCreateService = () => {
    router.push('/dashboard/provider/create-service')
  }

  const handleEditService = (serviceId: string) => {
    router.push(`/dashboard/provider/provider-services/${serviceId}/edit`)
  }

  const handleViewService = (serviceId: string) => {
    router.push(`/dashboard/provider/provider-services/${serviceId}`)
  }

  const handleDeleteService = async (serviceId: string) => {
    if (confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      try {
        const supabase = await getSupabaseClient()
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', serviceId)

        if (error) {
          console.error('Error deleting service:', error)
          alert('Failed to delete service')
        } else {
          setServices(services.filter(s => s.id !== serviceId))
          fetchServiceStats()
          alert('Service deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting service:', error)
        alert('Failed to delete service')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading your professional services...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Building2 className="h-10 w-10 text-blue-600" />
                My Services
              </h1>
              <p className="text-gray-600 text-lg">Manage and optimize your professional service offerings</p>
            </div>
            <Button onClick={handleCreateService} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="mr-2 h-5 w-5" />
              Add New Service
            </Button>
          </div>

          {/* Service Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Services</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalServices}</p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-full">
                    <Building2 className="h-6 w-6 text-blue-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Active Services</p>
                    <p className="text-2xl font-bold text-green-900">{stats.activeServices}</p>
                    <p className="text-xs text-green-700">
                      {stats.totalServices > 0 ? Math.round((stats.activeServices / stats.totalServices) * 100) : 0}% of total
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-full">
                    <TrendingUp className="h-6 w-6 text-green-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.totalRevenue, 'OMR')}</p>
                  </div>
                  <div className="p-3 bg-purple-200 rounded-full">
                    <DollarSign className="h-6 w-6 text-purple-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Avg. Rating</p>
                    <p className="text-2xl font-bold text-orange-900">{stats.averageRating.toFixed(1)}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-3 w-3 ${star <= stats.averageRating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-full">
                    <Star className="h-6 w-6 text-orange-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Search and Filters */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 border-2 focus:border-blue-500 transition-colors"
                  />
                </div>
                
                <div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="border-2 focus:border-blue-500 transition-colors">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="border-2 focus:border-blue-500 transition-colors">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={clearFilters} className="border-2">
                    <Filter className="mr-2 h-4 w-4" />
                    Clear Filters
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">View:</span>
                  <div className="flex border rounded-lg overflow-hidden">
                    <Button
                      type="button"
                      variant={selectedView === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedView('grid')}
                      className="rounded-none"
                    >
                      Grid
                    </Button>
                    <Button
                      type="button"
                      variant={selectedView === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSelectedView('list')}
                      className="rounded-none"
                    >
                      List
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="services" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="contracts">Contracts & Billing</TabsTrigger>
            <TabsTrigger value="support">Support & Queries</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">

        {/* Services Display */}
        {services.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No services found</h3>
              <p className="text-gray-600 mb-6 text-lg">
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your search criteria to find what you\'re looking for'
                  : 'Start building your professional service portfolio today'
                }
              </p>
              <div className="flex gap-3 justify-center">
                {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                  <Button onClick={clearFilters} variant="outline" size="lg">
                    Clear all filters
                  </Button>
                )}
                {!searchQuery && selectedCategory === 'all' && selectedStatus === 'all' && (
                  <Button onClick={handleCreateService} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Service
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className={selectedView === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-4'
          }>
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-3 group-hover:text-blue-600 transition-colors">
                        {service.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3 text-gray-600 leading-relaxed">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                      {service.category}
                    </Badge>
                    <Badge className={`${getStatusColor(service.status)} flex items-center gap-1`}>
                      {getStatusIcon(service.status)}
                      {service.status}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-semibold">
                      {formatCurrency(service.base_price, service.currency)}
                    </Badge>
                    {/* Digital Marketing specific badges */}
                    {service.delivery_timeframe && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.delivery_timeframe}
                      </Badge>
                    )}
                    {service.revision_policy && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        {service.revision_policy}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Service Metrics */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="font-semibold text-gray-900">{service.views_count || 0}</div>
                        <div className="text-gray-500 text-xs">Views</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="font-semibold text-gray-900">{service.bookings_count || 0}</div>
                        <div className="text-gray-500 text-xs">Bookings</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <div className="font-semibold text-gray-900">{service.rating ? service.rating.toFixed(1) : 'N/A'}</div>
                        <div className="text-gray-500 text-xs">Rating</div>
                      </div>
                    </div>

                    {/* Service Packages - Digital Marketing Specific */}
                    {service.service_packages && service.service_packages.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700">Service Packages:</div>
                        <div className="grid grid-cols-1 gap-2">
                          {service.service_packages.slice(0, 2).map((pkg, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? "default" : "secondary"} className="text-xs">
                                  {pkg.name}
                                </Badge>
                                <span className="text-xs text-gray-600">
                                  {pkg.delivery_days} days • {pkg.revisions} revisions
                                </span>
                              </div>
                              <span className="font-semibold text-blue-900 text-sm">
                                {formatCurrency(pkg.price, service.currency)}
                              </span>
                            </div>
                          ))}
                          {service.service_packages.length > 2 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{service.service_packages.length - 2} more packages
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Creation Date */}
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created: {new Date(service.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewService(service.id)}
                        className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditService(service.id)}
                          className="hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          {/* Contracts & Billing Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Contracts & Billing</h2>
              <Button onClick={() => alert('Contract creation feature coming soon!')}>
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileCheck className="h-5 w-5 mr-2" />
                    Active Contracts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contracts.filter(c => c.status === 'active').map((contract) => (
                      <div key={contract.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900">{contract.title}</h4>
                        <p className="text-sm text-green-700">{contract.clientName}</p>
                        <p className="text-lg font-bold text-green-900">{formatCurrency(contract.amount)}</p>
                        <p className="text-xs text-green-600">Due: {contract.dueDate}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Pending Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {contracts.filter(c => c.status === 'pending_signature').map((contract) => (
                      <div key={contract.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-yellow-900">{contract.title}</h4>
                        <p className="text-sm text-yellow-700">{contract.clientName}</p>
                        <p className="text-lg font-bold text-yellow-900">{formatCurrency(contract.amount)}</p>
                        <p className="text-xs text-yellow-600">{contract.actionRequired}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Billing Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-900">{formatCurrency(4300)}</p>
                      <p className="text-sm text-blue-700">Total Outstanding</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(1800)}</p>
                      <p className="text-sm text-green-700">This Month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Support & Queries Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Support & Queries</h2>
              <Button onClick={() => alert('Support ticket creation feature coming soon!')}>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Open Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {supportTickets.filter(t => t.status === 'open').map((ticket) => (
                      <div key={ticket.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-red-900">{ticket.title}</h4>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-red-700">{ticket.category}</p>
                        <p className="text-xs text-red-600">Created: {ticket.createdAt}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    In Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {supportTickets.filter(t => t.status === 'in_progress').map((ticket) => (
                      <div key={ticket.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-blue-900">{ticket.title}</h4>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-blue-700">{ticket.category}</p>
                        <p className="text-xs text-blue-600">Updated: {ticket.lastUpdated}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Resources & Documentation</h2>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{resource.title}</CardTitle>
                      {resource.type === 'PDF' && <FileText className="h-5 w-5 text-red-500" />}
                      {resource.type === 'Video' && <Play className="h-5 w-5 text-blue-500" />}
                      {resource.type === 'Document' && <BookOpen className="h-5 w-5 text-green-500" />}
                    </div>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Badge variant="secondary">{resource.category}</Badge>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Learning Paths
                </CardTitle>
                <CardDescription>Structured learning to improve your skills</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Beginner Provider</h4>
                    <p className="text-sm text-blue-700 mb-3">Learn the basics of service delivery</p>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700">
                      Start Learning
                    </Button>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-900 mb-2">Advanced Provider</h4>
                    <p className="text-sm text-green-700 mb-3">Master advanced service techniques</p>
                    <Button size="sm" variant="outline" className="border-green-300 text-green-700">
                      Continue
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Referral Program</h2>
              <Button onClick={() => alert('Referral invitation feature coming soon!')}>
                <Share2 className="h-4 w-4 mr-2" />
                Invite Friends
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Referral Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-900">12</p>
                      <p className="text-sm text-blue-700">Total Referrals</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-900">{formatCurrency(1800)}</p>
                      <p className="text-sm text-green-700">Total Commission</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Completed Referrals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {referrals.filter(r => r.status === 'completed').map((referral) => (
                      <div key={referral.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-900">{referral.clientName}</h4>
                        <p className="text-lg font-bold text-green-900">{formatCurrency(referral.commission)}</p>
                        <p className="text-xs text-green-600">Completed: {referral.date}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Pending Referrals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {referrals.filter(r => r.status === 'pending').map((referral) => (
                      <div key={referral.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-medium text-yellow-900">{referral.clientName}</h4>
                        <p className="text-lg font-bold text-yellow-900">{formatCurrency(referral.commission)}</p>
                        <p className="text-xs text-yellow-600">Pending: {referral.date}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Share2 className="h-5 w-5 mr-2" />
                  Share Your Referral Link
                </CardTitle>
                <CardDescription>Invite friends and earn commissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input 
                    value="https://businesshub.com/ref/provider123" 
                    readOnly 
                    className="flex-1"
                  />
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Earn 10% commission on your referrals' first booking
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
