'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  Download, 
  FileText, 
  Banknote, 
  Calendar, 
  User, 
  Building2, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Receipt,
  Eye,
  MoreHorizontal,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'

interface InvoiceRecord {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'void'
  created_at: string
  pdf_url?: string | null
  bookings?: { services?: { title?: string } | null } | null
  clients?: { full_name?: string } | null
  providers?: { full_name?: string } | null
  // Enriched properties added during data fetching
  serviceTitle?: string
  clientName?: string
  providerName?: string
  clientEmail?: string
  providerEmail?: string
  clientPhone?: string
  providerPhone?: string
  providerCompany?: string
  dueDate?: string
  isOverdue?: boolean
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'client' | 'provider' | 'admin'>('client')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    totalAmount: 0
  })
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  useEffect(() => {
    filterAndSortInvoices()
  }, [invoices, searchTerm, statusFilter, sortBy, sortOrder])

  const filterAndSortInvoices = () => {
    let filtered = [...invoices]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.serviceTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    // Apply date range filter (created_at)
    if (startDate) {
      const start = new Date(startDate)
      filtered = filtered.filter(inv => new Date(inv.created_at) >= start)
    }
    if (endDate) {
      const end = new Date(endDate)
      // include end date entire day
      end.setHours(23,59,59,999)
      filtered = filtered.filter(inv => new Date(inv.created_at) <= end)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'amount':
          aValue = a.amount
          bValue = b.amount
          break
        case 'service':
          aValue = a.serviceTitle || ''
          bValue = b.serviceTitle || ''
          break
        case 'date':
        default:
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredInvoices(filtered)
  }

  const formatInvoiceNumber = (invoice: InvoiceRecord) => {
    // Prefer a stable, readable number based on date and id
    const datePart = formatDate(invoice.created_at).replaceAll('/', '')
    const idPart = invoice.id.replace('virtual-', '').slice(0, 6).toUpperCase()
    return `INV-${datePart}-${idPart}`
  }

  const csvRows = useMemo(() => {
    const header = ['Invoice No', 'Status', 'Date', 'Service', 'Amount', 'Currency', 'Client', 'Provider', 'Invoice ID']
    const rows = filteredInvoices.map(inv => [
      formatInvoiceNumber(inv),
      inv.status,
      formatDate(inv.created_at),
      inv.serviceTitle || 'Service',
      String(inv.amount || 0),
      inv.currency || 'OMR',
      inv.clientName || '',
      inv.providerName || '',
      inv.id
    ])
    return [header, ...rows]
  }, [filteredInvoices])

  const downloadCsv = () => {
    const csv = csvRows.map(r => r.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invoices.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const calculateStats = (invoices: InvoiceRecord[]) => {
    const total = invoices.length
    const paid = invoices.filter(inv => inv.status === 'paid').length
    const pending = invoices.filter(inv => inv.status === 'issued').length
    const totalAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)

    setStats({ total, paid, pending, totalAmount })
  }

  const generateInvoicesFromBookings = async (userId: string, userRole: string) => {
    try {
      const supabase = await getSupabaseClient()
      
      // Get bookings that need invoices
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          id, 
          client_id, 
          provider_id, 
          subtotal, 
          currency, 
          status,
          created_at
        `)
        .in('status', ['paid', 'in_progress', 'completed'])

      if (userRole === 'client') {
        bookingsQuery = bookingsQuery.eq('client_id', userId)
      } else if (userRole === 'provider') {
        bookingsQuery = bookingsQuery.eq('provider_id', userId)
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery
      if (bookingsError) throw bookingsError

      if (!bookings || bookings.length === 0) return

      // Check which bookings already have invoices
      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('booking_id')
        .in('booking_id', bookings.map(b => b.id))

      const existingBookingIds = new Set(existingInvoices?.map(inv => inv.booking_id) || [])
      
      // Generate invoices for bookings that don't have them
      const invoicesToCreate = bookings
        .filter(booking => !existingBookingIds.has(booking.id))
        .map(booking => ({
          booking_id: booking.id,
          client_id: booking.client_id,
          provider_id: booking.provider_id,
          amount: booking.subtotal || 0,
          currency: booking.currency || 'OMR',
          status: booking.status === 'paid' ? 'paid' : 'issued',
          created_at: new Date().toISOString()
        }))

      if (invoicesToCreate.length > 0) {
        // Try to insert invoices, but handle permission errors gracefully
        const { error: insertError } = await supabase
          .from('invoices')
          .insert(invoicesToCreate)

        if (insertError) {
          // If permission denied, show a helpful message instead of failing silently
          if (insertError.code === '42501') {
            console.warn('Permission denied for invoice creation. RLS policies may need updating.')
            // For now, we'll create virtual invoices that exist only in the UI
            // This allows the feature to work while the permissions are being fixed
            const virtualInvoices = invoicesToCreate.map(invoice => ({
              ...invoice,
              id: `virtual-${invoice.booking_id}`,
              pdf_url: null
            }))
            
            // Store virtual invoices in localStorage for this session
            localStorage.setItem('virtual_invoices', JSON.stringify(virtualInvoices))
            console.log(`Created ${virtualInvoices.length} virtual invoices for this session`)
            return
          }
          throw insertError
        }
        console.log(`Generated ${invoicesToCreate.length} invoices from bookings`)
      }
    } catch (error) {
      console.error('Error generating invoices from bookings:', error)
    }
  }

  const fetchInvoices = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const userRole = user.user_metadata?.role || 'client'
      setRole(userRole)

      // First, try to fetch existing invoices
      let query = supabase
        .from('invoices')
        .select('id, booking_id, client_id, provider_id, amount, currency, status, created_at, pdf_url')
        .order('created_at', { ascending: false })

      if (userRole === 'client') {
        query = query.eq('client_id', user.id)
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id)
      }

      let { data: invoicesData, error } = await query
      if (error) throw error

      // If no invoices exist, generate them from bookings
      if (!invoicesData || invoicesData.length === 0) {
        await generateInvoicesFromBookings(user.id, userRole)
        // Fetch again after generating
        const { data: newInvoicesData } = await query
        invoicesData = newInvoicesData
      }

      // Client view should only show provider-issued or paid invoices from DB (no drafts/virtuals)
      if (userRole === 'client') {
        invoicesData = (invoicesData || []).filter((inv: any) => inv.status === 'issued' || inv.status === 'paid')
      } else {
        // Add virtual invoices from localStorage if they exist (useful for providers while permissions are finalized)
        try {
          const virtualInvoices = localStorage.getItem('virtual_invoices')
          if (virtualInvoices) {
            const parsedVirtualInvoices = JSON.parse(virtualInvoices)
            // Filter virtual invoices for this user
            const userVirtualInvoices = parsedVirtualInvoices.filter((invoice: any) => 
              invoice.client_id === user.id || invoice.provider_id === user.id
            )
            if (userVirtualInvoices.length > 0) {
              invoicesData = [...(invoicesData || []), ...userVirtualInvoices]
            }
          }
        } catch (error) {
          console.warn('Error loading virtual invoices:', error)
        }
      }
      
      // Fetch related data separately to avoid complex joins
      const enrichedInvoices = await Promise.all(
        (invoicesData || []).map(async (invoice: any) => {
          try {
            // Get booking and service info
            const { data: booking } = await supabase
              .from('bookings')
              .select('id, service_id')
              .eq('id', invoice.booking_id)
              .single()
            
            let serviceTitle = 'Service'
            if (booking?.service_id) {
              const { data: service } = await supabase
                .from('services')
                .select('title')
                .eq('id', booking.service_id)
                .single()
              serviceTitle = service?.title || 'Service'
            }
            
            // Get client and provider names
            const { data: client } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', invoice.client_id)
              .single()
            
            const { data: provider } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', invoice.provider_id)
              .single()
            
            // compute due date (14 days after created_at) and overdue flag
            const dueDate = new Date(invoice.created_at)
            dueDate.setDate(dueDate.getDate() + 14)

            return {
              ...invoice,
              serviceTitle,
              clientName: client?.full_name || 'Unknown Client',
              providerName: provider?.full_name || 'Unknown Provider',
              clientEmail: (client as any)?.email,
              providerEmail: (provider as any)?.email,
              clientPhone: (client as any)?.phone,
              providerPhone: (provider as any)?.phone,
              providerCompany: (provider as any)?.company_name,
              dueDate: dueDate.toISOString(),
              isOverdue: (invoice.status !== 'paid') && (Date.now() > dueDate.getTime())
            }
          } catch (error) {
            console.error('Error enriching invoice:', error)
            return {
              ...invoice,
              serviceTitle: 'Service',
              clientName: 'Unknown Client',
              providerName: 'Unknown Provider'
            }
          }
        })
      )
      
      setInvoices(enrichedInvoices)
      calculateStats(enrichedInvoices)
    } catch (e) {
      console.error('Error fetching invoices', e)
      setInvoices([])
      setStats({ total: 0, paid: 0, pending: 0, totalAmount: 0 })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'issued':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'draft':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'void':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'issued':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'void':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices & Receipts</h1>
          <p className="text-gray-600 mt-2">
            {role === 'client' 
              ? 'View invoices issued by providers and download receipts'
              : 'Manage invoices and track payments from clients'
            }
          </p>
        </div>
        <div className="flex gap-3">
          {role !== 'client' && (
            <Button 
              onClick={async () => {
                const supabase = await getSupabaseClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  const userRole = user.user_metadata?.role || 'client'
                  await generateInvoicesFromBookings(user.id, userRole)
                  await fetchInvoices()
                }
              }}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <FileText className="h-4 w-4" />
              Generate Invoices
            </Button>
          )}
          <Button 
            onClick={fetchInvoices} 
            variant="outline" 
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Invoices</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Receipt className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Paid</p>
                <p className="text-2xl font-bold text-green-900">{stats.paid}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(stats.totalAmount, 'OMR')}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Management
              </CardTitle>
              <CardDescription>
                {role === 'client' 
                  ? 'Issued invoices from providers. Download receipts when available.' 
                  : 'Manage invoices and track client payments'
                }
              </CardDescription>
            </div>
            <div className="text-sm text-gray-500">
              {filteredInvoices.length} of {invoices.length} invoices
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col xl:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={role === 'client' ? 'Search by service or invoice ID...' : 'Search invoices by service, client, or invoice ID...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  {role !== 'client' && <SelectItem value="draft">Draft</SelectItem>}
                  {role !== 'client' && <SelectItem value="void">Void</SelectItem>}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3"
              >
                {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </Button>

              <div className="flex items-center gap-2">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                <span className="text-gray-400">to</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
              </div>

              <Button variant="outline" size="sm" onClick={downloadCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Invoice List */}
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {invoices.length === 0 ? 'No invoices found' : 'No invoices match your filters'}
              </h3>
              <p className="text-gray-500 mb-4">
                {invoices.length === 0 
                  ? (role === 'client' 
                    ? 'You will see invoices here once a provider issues them for your bookings.'
                    : 'Invoices will be automatically generated from your bookings. Click "Generate Invoices" to create them now.')
                  : 'Try adjusting your search criteria or filters.'
                }
              </p>
              {invoices.length === 0 && role !== 'client' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Invoice Generation Notice
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          If you encounter permission errors when generating invoices, this is due to database security policies. 
                          The invoices feature will work with virtual invoices for now, and the database permissions will be updated soon.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {invoices.length === 0 && (
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={fetchInvoices}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  {role !== 'client' && (
                  <Button onClick={async () => {
                    const supabase = await getSupabaseClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user) {
                      const userRole = user.user_metadata?.role || 'client'
                      await generateInvoicesFromBookings(user.id, userRole)
                      await fetchInvoices()
                    }
                  }}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Invoices
                  </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(invoice.status)}
                            <h3 className="font-semibold text-gray-900">
                              {invoice.serviceTitle || 'Service'}
                            </h3>
                          </div>
                          <Badge className={`${getStatusColor(invoice.status)} border`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(invoice.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            <span className="font-medium text-gray-900">
                              {formatCurrency(invoice.amount || 0, invoice.currency || 'OMR')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {role === 'client' ? (
                              <>
                                <Building2 className="h-4 w-4" />
                                <span>{invoice.providerName || 'Unknown Provider'}</span>
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4" />
                                <span>{invoice.clientName || 'Unknown Client'}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs text-gray-500">
                          <div>
                            Invoice No: {formatInvoiceNumber(invoice)} • ID: {invoice.id}
                          </div>
                          <div className="flex items-center gap-2">
                            {invoice.isOverdue && (
                              <span className="px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200">Overdue</span>
                            )}
                            {invoice.dueDate && (
                              <span>Due: {formatDate(invoice.dueDate)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 ml-6">
                        {invoice.pdf_url ? (
                          <Button asChild variant="outline" size="sm">
                            <a href={invoice.pdf_url} target="_blank" rel="noreferrer">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </a>
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={async () => {
                              // Generate PDF for this invoice
                              try {
                                const response = await fetch('/api/invoices/generate-pdf', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ invoiceId: invoice.id })
                                })
                                if (response.ok) {
                                  await fetchInvoices() // Refresh to get updated PDF URL
                                }
                              } catch (error) {
                                console.error('Error generating PDF:', error)
                              }
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate PDF
                          </Button>
                        )}
                        
                        <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(invoice)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>

                        {invoice.pdf_url && (
                          <Button asChild size="sm">
                            <a href={invoice.pdf_url} download>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Drawer/Modal */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={(open: boolean) => !open && setSelectedInvoice(null)}>
          <DialogContent className="max-w-3xl w-full">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Invoice {formatInvoiceNumber(selectedInvoice)}</h3>
                  <p className="text-sm text-gray-500">Created {formatDate(selectedInvoice.created_at)} • {selectedInvoice.status.toUpperCase()}</p>
                </div>
                {selectedInvoice.providerCompany && (
                  <div className="text-right text-sm text-gray-600">
                    <div className="font-medium">{selectedInvoice.providerCompany}</div>
                    <div>{selectedInvoice.providerName}</div>
                    {selectedInvoice.providerEmail && <div>{selectedInvoice.providerEmail}</div>}
                  </div>
                )}
              </div>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Billed To</div>
                  <div className="text-gray-900">{selectedInvoice.clientName}</div>
                  {selectedInvoice.clientEmail && <div className="text-gray-600 text-sm">{selectedInvoice.clientEmail}</div>}
                  {selectedInvoice.clientPhone && <div className="text-gray-600 text-sm">{selectedInvoice.clientPhone}</div>}
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Issued By</div>
                  <div className="text-gray-900">{selectedInvoice.providerCompany || selectedInvoice.providerName}</div>
                  {selectedInvoice.providerEmail && <div className="text-gray-600 text-sm">{selectedInvoice.providerEmail}</div>}
                  {selectedInvoice.providerPhone && <div className="text-gray-600 text-sm">{selectedInvoice.providerPhone}</div>}
                </div>
              </div>
              <div className="rounded-lg border">
                <div className="p-4 border-b font-medium">Line Items</div>
                <div className="p-4 text-sm">
                  {/* For now we have one line derived from the service */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{selectedInvoice.serviceTitle || 'Service'}</div>
                      <div className="text-gray-500">Booking {selectedInvoice.booking_id.slice(0,8)}</div>
                    </div>
                    <div className="font-semibold">{formatCurrency(selectedInvoice.amount || 0, selectedInvoice.currency || 'OMR')}</div>
                  </div>
                </div>
                <div className="p-4 border-t flex items-center justify-between text-sm">
                  <div className="text-gray-500">Due {selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate) : '—'}</div>
                  <div className="text-gray-900 font-semibold">Total: {formatCurrency(selectedInvoice.amount || 0, selectedInvoice.currency || 'OMR')}</div>
                </div>
              </div>
              {selectedInvoice.isOverdue && role === 'provider' && (
                <div className="flex items-center justify-between rounded-lg border p-4 bg-red-50 border-red-200">
                  <div className="text-sm text-red-700">This invoice is overdue. Consider sending a reminder.</div>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        if (!selectedInvoice?.clientEmail) return
                        await fetch('/api/notifications/email', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            to: selectedInvoice.clientEmail,
                            subject: `Payment reminder for invoice ${formatInvoiceNumber(selectedInvoice)}`,
                            text: `Dear ${selectedInvoice.clientName},\n\nThis is a friendly reminder that invoice ${formatInvoiceNumber(selectedInvoice)} for ${formatCurrency(selectedInvoice.amount || 0, selectedInvoice.currency || 'OMR')} is overdue.\n\nThank you.`,
                          })
                        })
                      } catch {}
                    }}
                  >
                    Send Reminder
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}


