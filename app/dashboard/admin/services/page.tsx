'use client'

import { useState, useEffect, useRef } from 'react'
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
  Package,
  Mail,
  Phone,
  Link as LinkIcon,
  Copy
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getServiceCardImageUrl } from '@/lib/service-images'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

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
  cover_image_url?: string
  images?: string[]
  attachments?: string[]
  slug?: string
  rating?: number
  review_count?: number
  booking_count?: number
  provider: {
    id: string
    full_name: string
    email: string
    phone?: string
    company_name?: string
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
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [rawSearch, setRawSearch] = useState(searchParams.get('q') || '')
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
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [allowFeature, setAllowFeature] = useState(true)
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'reject' | 'approve' | 'toggleFeatured' | null>(null)
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [editingCategory, setEditingCategory] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [quickNote, setQuickNote] = useState('')
  const [actorId, setActorId] = useState<string | null>(null)
  const [actorName, setActorName] = useState<string | null>(null)
  const [actorEmail, setActorEmail] = useState<string | null>(null)
  const [actorRole, setActorRole] = useState<string | null>(null)
  const canEdit = actorRole === 'admin' || actorRole === 'staff'
  const abortRef = useRef<AbortController | null>(null)
  const latestReqRef = useRef(0)

  useEffect(() => {
    loadServices()
  }, [page, pageSize, searchQuery, statusFilter, sortBy, sortOrder])

  // Clear selection when the list or filters change
  useEffect(() => {
    setSelectedIds([])
  }, [page, pageSize, searchQuery, statusFilter, sortBy, sortOrder, services.length])

  // Abort any in-flight request when unmounting
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

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

  // Detect if 'featured' column exists; if not, hide feature-related UI
  useEffect(() => {
    const checkSchema = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data, error } = await supabase
          .from('services')
          .select('featured')
          .limit(1)
        if (error) throw error
        setAllowFeature(true)
      } catch (e: any) {
        if (e?.code === '42703') {
          setAllowFeature(false)
        } else {
          setAllowFeature(false)
        }
      }
    }
    checkSchema()
  }, [])


  // Load current actor profile to gate inline edits and enrich audit logs
  useEffect(() => {
    const loadActor = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: userResp } = await supabase.auth.getUser()
        const uid = userResp?.user?.id || null
        setActorId(uid)
        if (uid) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name,email,role')
            .eq('id', uid)
            .single()
          setActorName(prof?.full_name || null)
          setActorEmail(prof?.email || null)
          setActorRole(prof?.role || null)
        }
      } catch (e) {
        // ignore
      }
    }
    loadActor()
  }, [])

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(rawSearch), 300)
    return () => clearTimeout(t)
  }, [rawSearch])

  const loadServices = async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const { signal } = controller
    setLoading(true)
    const reqId = ++latestReqRef.current

    try {
      const supabase = await getSupabaseClient()
      
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('services')
        .select(`
          *,
          provider:profiles!inner(
            id,
            full_name,
            email,
            phone,
            company_name
          )
        `, { count: 'exact' })
        .abortSignal(signal)

      if (searchQuery) {
        const like = `%${searchQuery}%`
        query = query.or(`title.ilike.${like},description.ilike.${like},category.ilike.${like}`)
        query = (query as any).or(
          `full_name.ilike.${like},email.ilike.${like},company_name.ilike.${like}`,
          { foreignTable: 'profiles' }
        )
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('approval_status', statusFilter)
      }

      const sortColumn = ['created_at', 'title', 'base_price'].includes(sortBy) ? sortBy : 'created_at'
      const { data, count, error } = await query
        .order(sortColumn as any, { ascending: sortOrder === 'asc', nullsFirst: false } as any)
        .range(from, to)

      if (signal.aborted || reqId !== latestReqRef.current) return
      if (error) throw error

      setServices(data || [])
      setTotalCount(count || 0)
      // If current page is out of bounds after new count, snap to last valid page
      const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))
      if (page > totalPages) {
        setPage(totalPages)
      }

      try {
        const [{ data: statRows }, { data: revRows }] = await Promise.all([
          supabase
            .rpc('services_stats', { p_search: searchQuery || null, p_status: statusFilter || null })
            .abortSignal(signal),
          supabase
            .rpc('bookings_revenue_stats', { p_search: searchQuery || null, p_status: statusFilter || null })
            .abortSignal(signal)
        ])
        const s = statRows?.[0] as any
        const r = revRows?.[0] as any
        if (s || r) {
          setStats({
            total: Number(s?.total) || 0,
            pending: Number(s?.pending) || 0,
            approved: Number(s?.approved) || 0,
            rejected: Number(s?.rejected) || 0,
            featured: Number(s?.featured) || 0,
            totalRevenue: Number(r?.booking_sum ?? s?.price_sum ?? 0) || 0
          })
        }
      } catch {}
      if (!signal.aborted && reqId === latestReqRef.current) setLoading(false)
    } catch (error: any) {
      if (!(error?.name || '').includes('Abort')) {
        console.error('Error loading services:', error)
        toast.error('Failed to load services')
      }
      if (!signal.aborted && reqId === latestReqRef.current) setLoading(false)
    }
  }

  // removed old page-level stats and client filtering; now using RPC stats + server filters only

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
      if (error?.code === '42703') {
        toast.error("'featured' column is missing. Run latest migrations and try again.")
      } else {
        toast.error('Failed to update featured status')
      }
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
      const nextVal = !service.featured
      const { error } = await supabase
        .from('services')
        .update({ 
          featured: nextVal,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id)

      if (error) throw error

      toast.success(`Service ${nextVal ? 'featured' : 'unfeatured'} successfully!`)
      loadServices()
    } catch (error: any) {
      console.error('Error featuring service:', error)
      toast.error('Failed to update featured status')
    }
  }

  const handleUpdatePricing = async (service: Service) => {
    // This would typically open a modal for editing pricing
    toast.success('Pricing update functionality coming soon!')
  }

  const handleViewService = (service: Service) => {
    setDetailsService(service)
    setDetailsOpen(true)
    setGalleryIndex(0)
    setEditingPrice(false)
    setEditingCategory(false)
    setPriceInput(String(service.base_price || ''))
    setCategoryInput(service.category || '')
    setQuickNote('')
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
    const rows = services.map(s => ({
      id: s.id,
      title: s.title,
      category: s.category,
      base_price: s.base_price,
      currency: s.currency,
      approval_status: s.approval_status,
      status: s.status,
      provider_name: s.provider?.full_name,
      provider_email: s.provider?.email,
      provider_company: s.provider?.company_name,
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
        'id','title','category','base_price','currency','approval_status','status','provider_name','provider_email','provider_company','created_at','updated_at'
      ]
      const rows: any[] = []

      const chunk = 1000
      let offset = 0
      while (true) {
        let q = supabase
          .from('services')
          .select(`
            *,
            provider:profiles(
              id,
              full_name,
              email,
              phone,
              company_name
            )
          `)

        if (searchQuery) {
          const like = `%${searchQuery}%`
          q = q.or(`title.ilike.${like},description.ilike.${like},category.ilike.${like}`)
          q = (q as any).or(
            `full_name.ilike.${like},email.ilike.${like},company_name.ilike.${like}`,
            { foreignTable: 'profiles' }
          )
        }
        if (statusFilter && statusFilter !== 'all') {
          q = q.eq('approval_status', statusFilter) as any
        }
        const sortColumn = ['created_at', 'title', 'base_price'].includes(sortBy) ? sortBy : 'created_at'
        q = q.order(sortColumn as any, { ascending: sortOrder === 'asc' }) as any

        const { data, error } = await q.range(offset, offset + chunk - 1)
        if (error) throw error
        rows.push(...(data || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          base_price: s.base_price,
          currency: s.currency,
          approval_status: s.approval_status,
          status: s.status,
          provider_name: s.provider?.full_name,
          provider_email: s.provider?.email,
          provider_company: s.provider?.company_name,
          created_at: s.created_at,
          updated_at: s.updated_at
        })))

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

  // Load audit logs on open
  useEffect(() => {
    const loadAudit = async () => {
      if (!detailsService) return
      setAuditLoading(true)
      try {
        const supabase = await getSupabaseClient()
        const { data, error } = await supabase
          .from('service_audit_logs')
          .select('*')
          .eq('service_id', detailsService.id)
          .order('created_at', { ascending: false })
        if (error) throw error
        setAuditLogs(data || [])
      } catch (e) {
        // graceful fallback using known timestamps
        setAuditLogs([
          { id: 'created', event: 'Created', created_at: detailsService.created_at },
          { id: 'updated', event: 'Last Updated', created_at: detailsService.updated_at }
        ])
      } finally {
        setAuditLoading(false)
      }
    }
    loadAudit()
  }, [detailsService])

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
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
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
                services={services}
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
                allowFeature={allowFeature}
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
        <DialogContent onClose={() => setDetailsOpen(false)} className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{detailsService?.title}</DialogTitle>
            <DialogDescription>Service details and metadata</DialogDescription>
          </DialogHeader>
          {detailsService && (
            <div className="space-y-5">
              <Tabs defaultValue="overview">
                <TabsList className="mb-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
              {/* Hero image + KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Gallery */}
                <div className="sm:col-span-1">
                  {detailsService.images && detailsService.images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="col-span-2 h-36 rounded-lg overflow-hidden border focus:outline-none hover:ring-2 hover:ring-blue-200"
                        onClick={() => setLightboxOpen(true)}
                        title="Open image"
                      >
                        <img
                          src={detailsService.images[galleryIndex]}
                          alt={`${detailsService.title} image ${galleryIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                      {detailsService.images.slice(0, 4).map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`h-16 rounded-lg overflow-hidden border focus:outline-none hover:ring-2 hover:ring-blue-200 ${galleryIndex === idx ? 'ring-2 ring-blue-500' : ''}`}
                          onClick={() => setGalleryIndex(idx)}
                          title={`Show image ${idx + 1}`}
                        >
                          <img src={url} alt={`${detailsService.title} thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-36 rounded-lg overflow-hidden border">
                      <img
                        src={getServiceCardImageUrl(detailsService.category, detailsService.title, detailsService.cover_image_url, 640, 360)}
                        alt={`${detailsService.title} cover`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2 grid grid-cols-3 gap-6">
                  <div className="p-4 rounded-lg border bg-white shadow-sm">
                    <div className="text-xs text-muted-foreground">Rating</div>
                    <div className="mt-1 flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <div className="text-lg font-semibold">{detailsService.rating?.toFixed(1) || '0.0'}</div>
                      {detailsService.review_count ? (
                        <div className="text-xs text-muted-foreground">({detailsService.review_count})</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-white shadow-sm">
                    <div className="text-xs text-muted-foreground">Bookings</div>
                    <div className="mt-1 text-lg font-semibold">{detailsService.booking_count || 0}</div>
                  </div>
                  <div className="p-4 rounded-lg border bg-white shadow-sm">
              <div className="text-xs text-muted-foreground">Est. Revenue (bookings × price)</div>
                    <div className="mt-1 text-lg font-semibold">{formatCurrency((detailsService.booking_count || 0) * (detailsService.base_price || 0), detailsService.currency)}</div>
                  </div>
                </div>
              </div>

                  {/* Sticky action + status summary */}
                  <div className="sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 border rounded-md p-2 flex items-start justify-between gap-4">
                <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(detailsService.approval_status)}
                    {detailsService.featured && (
                      <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-200 bg-yellow-50">Featured</Badge>
                    )}
                    {detailsService.status && (
                      <Badge variant="outline" className="text-xs">{detailsService.status}</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">{detailsService.category}</Badge>
                  </div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        ID: <span className="font-mono" title={detailsService.id}>{detailsService.id}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2 ml-1" onClick={() => navigator.clipboard?.writeText(detailsService.id)}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" aria-label="Approve service" disabled={!actorId} onClick={() => handleApproveService(detailsService)}>Approve</Button>
                      <Button size="sm" aria-label="Reject service" disabled={!actorId} variant="destructive" onClick={() => rejectService(detailsService.id)}>Reject</Button>
                      <Button size="sm" aria-label="Suspend service" disabled={!actorId} variant="outline" onClick={() => handleSuspendService(detailsService)}>Suspend</Button>
                      <Button size="sm" aria-label="Toggle featured" disabled={!actorId} variant="secondary" onClick={() => handleFeatureService(detailsService)}>
                    {detailsService.featured ? 'Unfeature' : 'Feature'}
                  </Button>
                  {detailsService.slug && (
                        <Link href={`/services/${detailsService.slug}`} target="_blank" rel="noreferrer" className="inline-flex">
                          <Button size="sm" aria-label="Open public page" variant="outline">Open page</Button>
                    </Link>
                  )}
                  {detailsService.provider?.id && (
                        <Button size="sm" aria-label="View provider profile" variant="outline" onClick={() => { setDetailsOpen(false); router.push(`/dashboard/admin/users?userId=${detailsService.provider!.id}`) }}>Provider</Button>
                  )}
                </div>
              </div>

              {/* Key facts grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Category</div>
                  {!editingCategory ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{detailsService.category}</Badge>
                      {canEdit && (
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setEditingCategory(true); setCategoryInput(detailsService.category || '') }}>Edit</Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input className="h-8 w-48" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} />
                      <Button size="sm" className="h-8" onClick={async () => {
                        const supabase = await getSupabaseClient()
                        const newCategory = categoryInput.trim()
                        const { error } = await supabase.from('services').update({ category: newCategory, updated_at: new Date().toISOString() }).eq('id', detailsService.id)
                        if (error) { toast.error('Failed to update category'); return }
                        // Write audit log with actor info
                        await supabase.from('service_audit_logs').insert({
                          service_id: detailsService.id,
                          event: 'Category Updated',
                          actor_id: actorId,
                          actor_name: actorName,
                          actor_email: actorEmail,
                          metadata: { from: detailsService.category, to: newCategory }
                        })
                        setEditingCategory(false)
                        setDetailsService({ ...detailsService, category: newCategory })
                        toast.success('Category updated')
                        loadServices()
                      }}>Save</Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingCategory(false)}>Cancel</Button>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Price</div>
                  {!editingPrice ? (
                    <div className="font-medium flex items-center gap-2">
                      {formatCurrency(detailsService.base_price, detailsService.currency)}
                      {canEdit && (
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setEditingPrice(true); setPriceInput(String(detailsService.base_price || '')) }}>Edit</Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input className="h-8 w-32" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />
                      <Button size="sm" className="h-8" onClick={async () => {
                        const supabase = await getSupabaseClient()
                        const newPrice = Number(priceInput)
                        if (!Number.isFinite(newPrice) || newPrice < 0) { toast.error('Invalid price'); return }
                        const { error } = await supabase.from('services').update({ base_price: newPrice, updated_at: new Date().toISOString() }).eq('id', detailsService.id)
                        if (error) { toast.error('Failed to update price'); return }
                        await supabase.from('service_audit_logs').insert({
                          service_id: detailsService.id,
                          event: 'Price Updated',
                          actor_id: actorId,
                          actor_name: actorName,
                          actor_email: actorEmail,
                          metadata: { from: detailsService.base_price, to: newPrice }
                        })
                        setEditingPrice(false)
                        setDetailsService({ ...detailsService, base_price: newPrice })
                        toast.success('Price updated')
                        loadServices()
                      }}>Save</Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingPrice(false)}>Cancel</Button>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Created</div>
                  <div>{formatDate(detailsService.created_at)}</div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="text-muted-foreground">Updated</div>
                  <div>{formatDate(detailsService.updated_at)}</div>
                </div>
                <div className="space-y-1 text-sm sm:col-span-2">
                  <div className="text-muted-foreground">Provider</div>
                  {detailsService.provider ? (
                    <div className="rounded-lg border bg-muted/30 p-3 flex flex-wrap items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {detailsService.provider.full_name?.[0] || 'P'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">{detailsService.provider.full_name || 'Unknown'}</div>
                        {detailsService.provider.company_name && (
                          <div className="text-xs text-muted-foreground">{detailsService.provider.company_name}</div>
                        )}
                        <div className="text-muted-foreground truncate">
                          {detailsService.provider.email ? (
                            <a className="underline" href={`mailto:${detailsService.provider.email}`} title={detailsService.provider.email}>{detailsService.provider.email}</a>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                        {detailsService.provider.id && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            ID: <span className="font-mono" title={detailsService.provider.id}>{detailsService.provider.id}</span>
                            <Button variant="ghost" size="sm" className="h-6 px-2 ml-1" onClick={() => navigator.clipboard?.writeText(detailsService.provider!.id!)}>
                              <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                          </div>
                        )}
                      </div>
                      {(detailsService.provider.email || detailsService.provider.phone) && (
                        <div className="flex items-center gap-2 ml-2">
                          {detailsService.provider.email && (
                            <Button size="sm" aria-label="Copy provider email" variant="outline" className="h-7 px-2" onClick={() => navigator.clipboard?.writeText(detailsService.provider!.email!)}>
                              <Copy className="h-3 w-3 mr-1" /> Email
                            </Button>
                          )}
                          {detailsService.provider.phone && (
                            <a href={`tel:${detailsService.provider.phone}`}>
                              <Button size="sm" aria-label="Call provider" variant="outline" className="h-7 px-2">
                                <Phone className="h-3 w-3 mr-1" /> Call
                              </Button>
                            </a>
                          )}
                          {detailsService.provider.email && (
                            <a href={`mailto:${detailsService.provider.email}`}>
                              <Button size="sm" aria-label="Email provider" variant="outline" className="h-7 px-2">
                                <Mail className="h-3 w-3 mr-1" /> Mail
                              </Button>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No provider linked —</div>
                  )}
                </div>
              </div>

              {/* Description */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Description</div>
                <ScrollArea className="max-h-48">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap pr-2">
                    {detailsService.description || '—'}
                  </div>
                </ScrollArea>
              </div>

              {/* Quick note */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Quick note (saved to audit log)</div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Add a brief note..." value={quickNote} onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const btn = document.getElementById('save-quick-note-btn') as HTMLButtonElement
                      btn?.click()
                    }
                  }} onChange={(e) => setQuickNote(e.target.value)} />
                  <Button id="save-quick-note-btn" disabled={!actorId} onClick={async () => {
                    if (!quickNote.trim()) { toast.error('Note is empty'); return }
                    try {
                      const supabase = await getSupabaseClient()
                      const { error } = await supabase.from('service_audit_logs').insert({
                        service_id: detailsService.id,
                        event: 'Note',
                        actor_id: actorId,
                        actor_name: actorName,
                        actor_email: actorEmail,
                        metadata: { note: quickNote }
                      })
                      if (error) throw error
                      setQuickNote('')
                      toast.success('Note saved')
                      const { data } = await supabase
                        .from('service_audit_logs')
                        .select('*')
                        .eq('service_id', detailsService.id)
                        .order('created_at', { ascending: false })
                      setAuditLogs(data || [])
                    } catch (e) {
                      toast.error('Failed to save note')
                    }
                  }}>Save</Button>
                </div>
              </div>

              {/* Attachments */}
              {detailsService.attachments && detailsService.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Attachments</div>
                  <div className="space-y-2">
                    {detailsService.attachments.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                        <LinkIcon className="h-4 w-4 mr-2" /> {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
                  <Separator />
                </TabsContent>

                <TabsContent value="history" className="space-y-2">
                  <div className="text-sm text-muted-foreground">Audit Log</div>
                  <div className="border rounded-md divide-y">
                    {auditLoading ? (
                      <>
                        <div className="p-3 animate-pulse">
                          <div className="h-3 bg-gray-200 rounded w-1/3" />
                        </div>
                        <div className="p-3 animate-pulse">
                          <div className="h-3 bg-gray-200 rounded w-1/4" />
                        </div>
                      </>
                    ) : auditLogs.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No history available.</div>
                    ) : (
                      auditLogs.map((log: any) => (
                        <div key={log.id} className="p-3 text-sm flex items-center justify-between">
                          <div>
                            <div className="font-medium">{log.event || log.action || 'Event'}</div>
                            {(log.actor_name || log.actor_email || log.actor_id) && (
                              <div className="text-xs text-muted-foreground">by {log.actor_name || log.actor_email || log.actor_id}</div>
                            )}
                          </div>
                          <div className="text-muted-foreground">{formatDate(log.created_at)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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
            <Button variant={confirmAction === 'reject' ? 'destructive' : 'default'} onClick={async () => {
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

      {/* Lightbox for images */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogOverlay />
        <DialogContent onClose={() => setLightboxOpen(false)} className="max-w-3xl p-0 bg-black">
          {detailsService && detailsService.images && detailsService.images.length > 0 && (
            <img src={detailsService.images[galleryIndex]} alt="Service image" className="w-full h-auto object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}