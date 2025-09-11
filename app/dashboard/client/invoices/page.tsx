'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  TrendingUp,
  CreditCard,
  Receipt,
  User,
  Building2
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import Invoice from '@/components/invoice/Invoice'

interface InvoiceData {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
  invoice_number?: string
  service_title?: string
  service_description?: string
  client_name?: string
  client_email?: string
  provider_name?: string
  provider_email?: string
  company_name?: string
  company_logo?: string
  due_date?: string
  created_at: string
  updated_at: string
  pdf_url?: string
  payment_terms?: string
  notes?: string
  subtotal?: number
  vat_percent?: number
  vat_amount?: number
  total_amount?: number
  paid_at?: string
  payment_method?: string
  booking?: {
    id: string
    status: string
  }
}

interface InvoiceStats {
  total: number
  paid: number
  pending: number
  overdue: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
}

export default function ClientInvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceData[]>([])
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showProfessionalView, setShowProfessionalView] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)

  useEffect(() => {
    checkUserAndFetchData()
  }, [])

  const checkUserAndFetchData = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      await fetchInvoices(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/sign-in')
    }
  }

  const fetchInvoices = async (userId: string) => {
    try {
      setLoading(true)
      
      if (!userId) {
        console.error('User ID not available')
        toast.error('Authentication required')
        router.push('/auth/sign-in')
        return
      }

      console.log('🔍 Fetching invoices for user:', userId)
      const supabase = await getSupabaseClient()
      
      // First, let's try a simple query to see if we can access the table
      const { data: testData, error: testError } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_id', userId)
        .limit(1)

      if (testError) {
        console.error('❌ Test query failed:', testError)
        toast.error(`Database error: ${testError.message}`)
        return
      }

      console.log('✅ Test query successful, fetching full data...')
      
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          booking:bookings(
            id,
            status,
            requirements
          )
        `)
        .eq('client_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching invoices:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        toast.error(`Failed to fetch invoices: ${error.message}`)
        return
      }

      console.log('✅ Successfully fetched invoices:', invoices?.length || 0)
      
      if (invoices && invoices.length > 0) {
        console.log('📄 Sample invoice:', invoices[0])
      }
      
      setInvoices(invoices || [])
      setFilteredInvoices(invoices || [])
      calculateStats(invoices || [])
      
      if (!invoices || invoices.length === 0) {
        console.log('ℹ️ No invoices found for user:', userId)
        // Don't show toast for empty results to avoid spam
      } else {
        toast.success(`Found ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`)
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching invoices:', error)
      toast.error('An unexpected error occurred while fetching invoices')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (invoices: InvoiceData[]) => {
    const total = invoices.length
    const paid = invoices.filter(inv => inv.status === 'paid').length
    const pending = invoices.filter(inv => inv.status === 'issued').length
    const overdue = invoices.filter(inv => {
      if (inv.status !== 'issued') return false
      return inv.due_date && new Date(inv.due_date) < new Date()
    }).length

    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || inv.amount || 0), 0)
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.total_amount || inv.amount || 0), 0)
    const pendingAmount = invoices
      .filter(inv => inv.status === 'issued')
      .reduce((sum, inv) => sum + (inv.total_amount || inv.amount || 0), 0)

    setStats({
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount
    })
  }

  const handleRefresh = async () => {
    if (!user) return
    
    setRefreshing(true)
    try {
      await fetchInvoices(user.id)
      toast.success('Invoices refreshed')
    } catch (error) {
      toast.error('Failed to refresh invoices')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterInvoices(term, statusFilter, dateFilter)
  }

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    filterInvoices(searchTerm, status, dateFilter)
  }

  const handleDateFilter = (date: string) => {
    setDateFilter(date)
    filterInvoices(searchTerm, statusFilter, date)
  }

  const filterInvoices = (search: string, status: string, date: string) => {
    let filtered = [...invoices]

    // Search filter
    if (search) {
      filtered = filtered.filter(invoice =>
        (invoice.invoice_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (invoice.service_title || '').toLowerCase().includes(search.toLowerCase()) ||
        (invoice.provider_name || '').toLowerCase().includes(search.toLowerCase())
      )
    }

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === status)
    }

    // Date filter
    if (date !== 'all') {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.created_at)
        switch (date) {
          case 'last30days':
            return invoiceDate >= thirtyDaysAgo
          case 'last90days':
            return invoiceDate >= ninetyDaysAgo
          case 'thisyear':
            return invoiceDate.getFullYear() === now.getFullYear()
          default:
            return true
        }
      })
    }

    setFilteredInvoices(filtered)
  }

  const getStatusBadge = (status: string, dueDate?: string) => {
    const isOverdue = status === 'issued' && dueDate && new Date(dueDate) < new Date()
    
    if (isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Overdue</Badge>
    }

    switch (status) {
      case 'paid':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Paid</Badge>
      case 'issued':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleViewInvoice = (invoice: InvoiceData) => {
    // Navigate to invoice details page
    router.push(`/dashboard/client/invoices/${invoice.id}`)
  }

  const handleDownloadInvoice = async (invoice: InvoiceData) => {
    try {
      console.log('📄 Downloading PDF for invoice:', invoice.id, invoice.invoice_number)
      
      // Generate PDF and download
      const response = await fetch('/api/invoices/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      })

      console.log('📊 PDF generation response status:', response.status)

      if (response.ok) {
        const blob = await response.blob()
        console.log('✅ PDF blob created, size:', blob.size, 'bytes')
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoice.invoice_number || invoice.id}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Invoice downloaded successfully')
      } else {
        const errorData = await response.json()
        console.error('❌ PDF generation error:', errorData)
        toast.error(`Failed to download invoice: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Error downloading invoice:', error)
      toast.error('Failed to download invoice')
    }
  }

  const handlePayInvoice = (invoice: InvoiceData) => {
    // Navigate to payment page
    toast.success('Payment functionality coming soon!')
    // router.push(`/dashboard/client/invoices/${invoice.id}/pay`)
  }

  const handleViewProfessionalInvoice = (invoice: InvoiceData) => {
    setSelectedInvoiceId(invoice.id)
    setShowProfessionalView(true)
  }

  const handleCloseProfessionalView = () => {
    setShowProfessionalView(false)
    setSelectedInvoiceId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Invoice View Modal */}
      {showProfessionalView && selectedInvoiceId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Professional Invoice View</h2>
              <Button
                onClick={handleCloseProfessionalView}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
            <div className="p-4">
              <Invoice 
                invoiceId={selectedInvoiceId}
                showPrintButton={true}
                onPrint={() => window.print()}
              />
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Invoices</h1>
              <p className="text-gray-600 mt-1">View and manage your invoices</p>
            </div>
            <Button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalAmount, 'OMR')} total value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.paidAmount, 'OMR')} received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.pendingAmount, 'OMR')} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Invoices
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search Invoices</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by invoice number, provider, or amount..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Status Filter</label>
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="issued">Issued (Pending)</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Select value={dateFilter} onValueChange={handleDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="last90days">Last 90 Days</SelectItem>
                    <SelectItem value="thisyear">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Search: "{searchTerm}"
                    <button onClick={() => handleSearch('')} className="ml-1 hover:text-red-500">×</button>
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Status: {statusFilter}
                    <button onClick={() => handleStatusFilter('all')} className="ml-1 hover:text-red-500">×</button>
                  </Badge>
                )}
                {dateFilter !== 'all' && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Date: {dateFilter}
                    <button onClick={() => handleDateFilter('all')} className="ml-1 hover:text-red-500">×</button>
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
            <CardDescription>
              {filteredInvoices.length === 0 ? 'No invoices found' : 'Manage your invoices and payments'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Try adjusting your filters to see more results'
                    : 'You don\'t have any invoices yet. Invoices will appear here when your bookings are approved.'}
                </p>
                <Button onClick={() => router.push('/dashboard/client')}>
                  View My Bookings
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => (
                  <div key={invoice.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-5 w-5 text-blue-600" />
                              <h3 className="text-xl font-bold text-gray-900">
                                {invoice.service_title || 'Service Invoice'}
                              </h3>
                            </div>
                            {getStatusBadge(invoice.status, invoice.due_date)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-sm text-gray-500">Invoice #</span>
                                <p className="font-semibold text-gray-900">{invoice.invoice_number || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-sm text-gray-500">Provider</span>
                                <p className="font-semibold text-gray-900">{invoice.provider_name || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-sm text-gray-500">Due Date</span>
                                <p className="font-semibold text-gray-900">
                                  {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-sm text-gray-500">Amount</span>
                                <p className="font-bold text-xl text-gray-900">
                                  {formatCurrency(invoice.total_amount || invoice.amount, invoice.currency)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-400" />
                              <div>
                                <span className="text-sm text-gray-500">Created</span>
                                <p className="font-semibold text-gray-900">{formatDate(invoice.created_at)}</p>
                              </div>
                            </div>
                            
                            {invoice.booking && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <div>
                                  <span className="text-sm text-gray-500">Booking Status</span>
                                  <p className="font-semibold text-gray-900 capitalize">{invoice.booking.status}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewInvoice(invoice)}
                              className="flex items-center gap-2 hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewProfessionalInvoice(invoice)}
                              className="flex items-center gap-2 hover:bg-purple-50"
                            >
                              <FileText className="h-4 w-4" />
                              Professional View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(invoice)}
                              className="flex items-center gap-2 hover:bg-green-50"
                            >
                              <Download className="h-4 w-4" />
                              Download PDF
                            </Button>
                          </div>
                          
                          {invoice.status === 'issued' && (
                            <Button
                              size="sm"
                              onClick={() => handlePayInvoice(invoice)}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CreditCard className="h-4 w-4" />
                              Pay Now
                            </Button>
                          )}
                          
                          {invoice.status === 'paid' && (
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium">Payment Completed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
