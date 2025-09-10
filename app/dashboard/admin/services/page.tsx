'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  DollarSign,
  Calendar,
  User,
  Building2,
  Star,
  AlertCircle,
  TrendingUp,
  Users,
  Package
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Service {
  id: string
  title: string
  description: string
  category: string
  base_price: number
  currency: string
  status: string
  approval_status: string
  featured: boolean
  created_at: string
  updated_at: string
  provider: {
    id: string
    full_name: string
    email: string
    phone?: string
  }
}

interface ServiceStats {
  total: number
  pending: number
  approved: number
  rejected: number
  featured: number
  totalRevenue: number
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState<ServiceStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    totalRevenue: 0
  })

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    filterServices()
  }, [services, searchQuery, statusFilter])

  const loadServices = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          provider:profiles!services_provider_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setServices(data || [])
      calculateStats(data || [])
      setLoading(false)
    } catch (error: any) {
      console.error('Error loading services:', error)
      toast.error('Failed to load services')
      setLoading(false)
    }
  }

  const calculateStats = (servicesData: Service[]) => {
    const total = servicesData.length
    const pending = servicesData.filter(s => s.approval_status === 'pending').length
    const approved = servicesData.filter(s => s.approval_status === 'approved').length
    const rejected = servicesData.filter(s => s.approval_status === 'rejected').length
    const featured = servicesData.filter(s => s.featured).length
    const totalRevenue = servicesData.reduce((sum, s) => sum + (s.base_price || 0), 0)

    setStats({
      total,
      pending,
      approved,
      rejected,
      featured,
      totalRevenue
    })
  }

  const filterServices = () => {
    let filtered = [...services]

    if (searchQuery) {
      filtered = filtered.filter(service =>
        service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.provider.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => service.approval_status === statusFilter)
    }

    setFilteredServices(filtered)
  }

  const approveService = async (serviceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .update({ 
          approval_status: 'approved',
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)

      if (error) throw error

      toast.success('Service approved successfully!')
      loadServices()
    } catch (error: any) {
      console.error('Error approving service:', error)
      toast.error('Failed to approve service')
    }
  }

  const rejectService = async (serviceId: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .update({ 
          approval_status: 'rejected',
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)

      if (error) throw error

      toast.success('Service rejected')
      loadServices()
    } catch (error: any) {
      console.error('Error rejecting service:', error)
      toast.error('Failed to reject service')
    }
  }

  const toggleFeatured = async (serviceId: string, currentFeatured: boolean) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .update({ 
          featured: !currentFeatured,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId)

      if (error) throw error

      toast.success(`Service ${!currentFeatured ? 'featured' : 'unfeatured'} successfully!`)
      loadServices()
    } catch (error: any) {
      console.error('Error toggling featured status:', error)
      toast.error('Failed to update featured status')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending Review', variant: 'secondary' as const, icon: Clock },
      approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const, icon: Clock }
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number, currency: string = 'OMR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Service Management</h1>
            <p className="text-blue-100 text-lg mb-4">
              Review and approve services from providers with comprehensive oversight
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Package className="h-4 w-4 mr-1" />
                <span>Total: {stats.total}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Pending: {stats.pending}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Approved: {stats.approved}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>Revenue: {formatCurrency(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={loadServices}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
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
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Featured</p>
                <p className="text-2xl font-bold text-purple-600">{stats.featured}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>Review and manage all services submitted by providers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, category, or provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center space-y-2">
                          <Package className="h-12 w-12 opacity-50" />
                          <p className="text-lg font-medium">No services found</p>
                          <p className="text-sm">Try adjusting your filters or search criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((service) => (
                      <TableRow key={service.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{service.title}</p>
                              {service.featured && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {service.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{service.provider.full_name}</p>
                            <p className="text-sm text-muted-foreground">{service.provider.email}</p>
                            {service.provider.phone && (
                              <p className="text-xs text-muted-foreground">{service.provider.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{service.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(service.base_price, service.currency)}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(service.approval_status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(service.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {service.approval_status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => approveService(service.id)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => rejectService(service.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => toggleFeatured(service.id, service.featured)}
                            >
                              <Star className={`h-4 w-4 mr-2 ${service.featured ? 'text-yellow-500 fill-current' : ''}`} />
                              {service.featured ? 'Unfeature' : 'Feature'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}