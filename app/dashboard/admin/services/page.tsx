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
import { EnhancedServiceTable } from '@/components/services/EnhancedServiceTable'
import { RealtimeNotifications } from '@/components/dashboard/RealtimeNotifications'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay } from '@/components/ui/dialog'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [services, setServices] = useState<Service[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [stats, setStats] = useState<ServiceStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    featured: 0,
    totalRevenue: 0
  })
  const [page, setPage] = useState(Number(searchParams.get('page') || 1))
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize') || 10))
  const [totalCount, setTotalCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsService, setDetailsService] = useState<Service | null>(null)
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reject' | 'approve' | 'toggleFeatured' | null>(null)

  useEffect(() => {
    loadServices()
  }, [page, pageSize, searchQuery, statusFilter, sortBy, sortOrder])

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    if (page && page !== 1) params.set('page', String(page))
    if (pageSize && pageSize !== 10) params.set('pageSize', String(pageSize))
    if (sortBy && sortBy !== 'created_at') params.set('sortBy', sortBy)
    if (sortOrder && sortOrder !== 'desc') params.set('sortOrder', sortOrder)
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`)
  }, [searchQuery, statusFilter, page, pageSize, sortBy, sortOrder])

  useEffect(() => {
    filterServices()
  }, [services, searchQuery, statusFilter])

  const loadServices = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('services')
        .select(`
          *,
          provider:profiles!services_provider_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `, { count: 'exact' })

      // Server-side search across service columns and provider fields
      if (searchQuery) {
        const like = `%${searchQuery}%`
        query = query.or(
          `title.ilike.${like},description.ilike.${like},category.ilike.${like},provider.full_name.ilike.${like},provider.email.ilike.${like}`
        )
      }

      // Server-side approval status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter)
      }

      // Server-side sort
      const sortColumn = ['created_at', 'title', 'base_price'].includes(sortBy) ? sortBy : 'created_at'
      query = query.order(sortColumn as any, { ascending: sortOrder === 'asc' })

      const { data, count, error } = await query.range(from, to)

      if (error) throw error

      setServices(data || [])
      setTotalCount(count || 0)
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

  // Enhanced service handlers for the new table
  const handleApproveService = async (service: Service) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .update({ 
          approval_status: 'approved',
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id)

      if (error) throw error

      toast.success('Service approved successfully!')
      loadServices()
    } catch (error: any) {
      console.error('Error approving service:', error)
      toast.error('Failed to approve service')
    }
  }

  const handleSuspendService = async (service: Service) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .update({ 
          status: 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id)

      if (error) throw error

      toast.success('Service suspended successfully!')
      loadServices()
    } catch (error: any) {
      console.error('Error suspending service:', error)
      toast.error('Failed to suspend service')
    }
  }

  const handleFeatureService = async (service: Service) => {
    try {
      const supabase = await getSupabaseClient()
      
      const { error } = await supabase
        .from('services')
        .update({ 
          featured: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id)

      if (error) throw error

      toast.success('Service featured successfully!')
      loadServices()
    } catch (error: any) {
      console.error('Error featuring service:', error)
      toast.error('Failed to feature service')
    }
  }

  const handleUpdatePricing = async (service: Service) => {
    // This would typically open a modal for editing pricing
    toast.success('Pricing update functionality coming soon!')
  }

  const handleViewService = (service: Service) => {
    setDetailsService(service)
    setDetailsOpen(true)
  }

  const handleEditService = (service: Service) => {
    // This would typically open an edit modal
    toast.success(`Editing service: ${service.title}`)
  }

  const handleDeleteService = (service: Service) => {
    // This would typically open a confirmation modal
    toast.success(`Delete service: ${service.title}`)
  }

  const exportCsv = () => {
    const rows = filteredServices.map(s => ({
      id: s.id,
      title: s.title,
      category: s.category,
      base_price: s.base_price,
      currency: s.currency,
      approval_status: s.approval_status,
      status: s.status,
      provider_name: s.provider?.full_name,
      provider_email: s.provider?.email,
      created_at: s.created_at,
      updated_at: s.updated_at
    }))
    const header = Object.keys(rows[0] || { id: 'id' })
    const csv = [
      header.join(','),
      ...rows.map(r => header.map(h => {
        const v = (r as any)[h]
        if (v === null || v === undefined) return ''
        const str = String(v).replace(/"/g, '""')
        return /[",\n]/.test(str) ? `"${str}"` : str
      }).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `services_page_${page}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportAllCsv = async () => {
    try {
      const supabase = await getSupabaseClient()

      const header = [
        'id','title','category','base_price','currency','approval_status','status','provider_name','provider_email','created_at','updated_at'
      ]
      const rows: any[] = []

      let query = supabase
        .from('services')
        .select(`
          *,
          provider:profiles!services_provider_id_fkey(
            id,
            full_name,
            email,
            phone
          )
        `, { count: 'exact' })

      if (searchQuery) {
        const like = `%${searchQuery}%`
        query = query.or(
          `title.ilike.${like},description.ilike.${like},category.ilike.${like},provider.full_name.ilike.${like},provider.email.ilike.${like}`
        )
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter)
      }
      const sortColumn = ['created_at', 'title', 'base_price'].includes(sortBy) ? sortBy : 'created_at'
      query = query.order(sortColumn as any, { ascending: sortOrder === 'asc' })

      const chunk = 1000
      let offset = 0
      while (true) {
        const { data, error } = await query.range(offset, offset + chunk - 1)
        if (error) throw error
        const batch = (data || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          base_price: s.base_price,
          currency: s.currency,
          approval_status: s.approval_status,
          status: s.status,
          provider_name: s.provider?.full_name,
          provider_email: s.provider?.email,
          created_at: s.created_at,
          updated_at: s.updated_at
        }))
        rows.push(...batch)
        if (!data || data.length < chunk) break
        offset += chunk
      }

      const csv = [
        header.join(','),
        ...rows.map(r => header.map(h => {
          const v = (r as any)[h]
          if (v === null || v === undefined) return ''
          const str = String(v).replace(/"/g, '""')
          return /[",\n]/.test(str) ? `"${str}"` : str
        }).join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `services_all.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export all failed', err)
      toast.error('Failed to export all')
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
            <RealtimeNotifications />
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
            <div className="flex flex-col lg:flex-row gap-4">
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
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1) }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date Created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="base_price">Price</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}>
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </Button>
              <Button variant="secondary" onClick={() => exportCsv()}>
                Export CSV
              </Button>
              <Button variant="secondary" onClick={() => exportAllCsv()}>
                Export All
              </Button>
            </div>

            {/* Enhanced Service Table */}
            <div className="overflow-x-auto">
              <EnhancedServiceTable
                services={filteredServices}
                onViewService={handleViewService}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onApproveService={handleApproveService}
                onSuspendService={handleSuspendService}
                onFeatureService={handleFeatureService}
                onUpdatePricing={handleUpdatePricing}
                searchQueryExternal={searchQuery}
                statusFilterExternal={statusFilter}
                hideInternalFilters
                selectable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                disableClientSorting
              />
            </div>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedIds.length} selected</Badge>
            <Button size="sm" onClick={() => { setConfirmAction('approve'); setConfirmOpen(true) }}>Approve</Button>
                <Button size="sm" variant="destructive" onClick={() => { setConfirmAction('reject'); setConfirmOpen(true) }}>Reject</Button>
            <Button size="sm" variant="outline" onClick={() => { setConfirmAction('toggleFeatured'); setConfirmOpen(true) }}>Toggle Featured</Button>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))} · {totalCount} total
              </div>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => (p < Math.ceil(totalCount / pageSize) ? p + 1 : p))} disabled={page >= Math.ceil(totalCount / pageSize)}>Next</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogOverlay />
        <DialogContent onClose={() => setDetailsOpen(false)}>
          <DialogHeader>
            <DialogTitle>{detailsService?.title}</DialogTitle>
            <DialogDescription>Service details and metadata</DialogDescription>
          </DialogHeader>
          {detailsService && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">ID: {detailsService.id}</div>
              <div className="text-sm">Category: <Badge variant="secondary">{detailsService.category}</Badge></div>
              <div className="text-sm">Price: {formatCurrency(detailsService.base_price, detailsService.currency)}</div>
              <div className="text-sm">Status: {getStatusBadge(detailsService.approval_status)}</div>
              <div className="text-sm">Provider: {detailsService.provider?.full_name} ({detailsService.provider?.email})</div>
              <div className="text-sm">Created: {formatDate(detailsService.created_at)}</div>
              <div className="text-sm">Updated: {formatDate(detailsService.updated_at)}</div>
              <div className="text-sm">Description:</div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {detailsService.description}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogOverlay />
        <DialogContent onClose={() => setConfirmOpen(false)}>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>Are you sure you want to proceed?</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (confirmAction === 'reject') {
                await Promise.all(selectedIds.map(async (id) => rejectService(id)))
                setSelectedIds([])
              } else if (confirmAction === 'approve') {
                await Promise.all(selectedIds.map(async (id) => approveService(id)))
                setSelectedIds([])
              } else if (confirmAction === 'toggleFeatured') {
                await Promise.all(selectedIds.map(async (id) => {
                  const svc = services.find(s => s.id === id)
                  if (svc) await toggleFeatured(id, !!svc.featured)
                }))
                setSelectedIds([])
              }
              setConfirmOpen(false)
            }}>Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}