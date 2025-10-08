'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  DollarSign,
  Calendar,
  Star,
  AlertCircle,
  TrendingUp,
  Users,
  Package,
  Settings
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'

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
}

interface ServiceStats {
  total: number
  active: number
  pending: number
  approved: number
  rejected: number
  featured: number
  totalRevenue: number
}

export default function ManageServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<ServiceStats>({
    total: 0,
    active: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    totalRevenue: 0
  })

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadServices()
    }
  }, [user])

  useEffect(() => {
    filterServices()
  }, [services, searchQuery, statusFilter])

  const loadUser = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadServices = async () => {
    if (!user) return

    try {
      const supabase = await getSupabaseClient()
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('provider_id', user.id)
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
    const active = servicesData.filter(s => s.status === 'active').length
    const pending = servicesData.filter(s => s.approval_status === 'pending').length
    const approved = servicesData.filter(s => s.approval_status === 'approved').length
    const rejected = servicesData.filter(s => s.approval_status === 'rejected').length
    const featured = servicesData.filter(s => s.featured).length
    const totalRevenue = servicesData.reduce((sum, s) => sum + (s.base_price || 0), 0)

    setStats({
      total,
      active,
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
        service.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(service => service.status === 'active')
      } else {
        filtered = filtered.filter(service => service.approval_status === statusFilter)
      }
    }

    setFilteredServices(filtered)
  }

  const viewService = (serviceId: string) => {
    console.log('🔍 View service clicked:', serviceId)
    try {
      router.push(`/dashboard/services/${serviceId}`)
    } catch (error) {
      console.error('❌ Error navigating to service detail:', error)
      toast.error('Failed to open service details')
    }
  }

  const editService = (serviceId: string) => {
    console.log('✏️ Edit service clicked:', serviceId)
    try {
      router.push(`/dashboard/services/${serviceId}/edit`)
    } catch (error) {
      console.error('❌ Error navigating to service edit:', error)
      toast.error('Failed to open service editor')
    }
  }

  const deleteService = async (serviceId: string) => {
    console.log('🗑️ Delete service clicked:', serviceId)
    
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      console.log('❌ Delete cancelled by user')
      return
    }

    try {
      console.log('🔄 Deleting service...')
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      if (error) {
        console.error('❌ Supabase delete error:', error)
        throw error
      }

      console.log('✅ Service deleted successfully')
      toast.success('Service deleted successfully!')
      loadServices()
    } catch (error: any) {
      console.error('❌ Error deleting service:', error)
      toast.error('Failed to delete service: ' + (error.message || 'Unknown error'))
    }
  }

  const getStatusBadge = (service: Service) => {
    if (service.approval_status === 'pending') {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending Review
        </Badge>
      )
    } else if (service.approval_status === 'approved') {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      )
    } else if (service.approval_status === 'rejected') {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Settings className="h-3 w-3" />
          {service.status}
        </Badge>
      )
    }
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
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Services</h1>
            <p className="text-purple-100 text-lg mb-4">
              Manage your services and track their approval status
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <Package className="h-4 w-4 mr-1" />
                <span>Total: {stats.total}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Approved: {stats.approved}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Pending: {stats.pending}</span>
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
              onClick={() => router.push('/dashboard/provider/create-service')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Service
            </Button>
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
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
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
          <CardTitle>Your Services</CardTitle>
          <CardDescription>Manage and track the status of your submitted services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your services..."
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
                  <SelectItem value="active">Active</SelectItem>
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
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center space-y-2">
                          <Package className="h-12 w-12 opacity-50" />
                          <p className="text-lg font-medium">No services found</p>
                          <p className="text-sm">Create your first service to get started</p>
                          <Button 
                            onClick={() => router.push('/dashboard/services/create')}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Service
                          </Button>
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
                          <Badge variant="outline">{service.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(service.base_price, service.currency)}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(service)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(service.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🔍 View button clicked for service:', service.id)
                                viewService(service.id)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('✏️ Edit button clicked for service:', service.id)
                                editService(service.id)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                console.log('🗑️ Delete button clicked for service:', service.id)
                                deleteService(service.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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

      {/* Approval Process Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Service Approval Process</h4>
              <p className="text-sm text-blue-700 mt-1">
                All services go through a review process to ensure quality and compliance. 
                Our admin team typically reviews submissions within 1-2 business days. 
                You'll receive email notifications about approval status updates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
