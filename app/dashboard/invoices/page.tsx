'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSupabaseClient } from '@/lib/supabase'
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

  const calculateStats = (invoices: InvoiceRecord[]) => {
    const total = invoices.length
    const paid = invoices.filter(inv => inv.status === 'paid').length
    const pending = invoices.filter(inv => inv.status === 'issued' || inv.status === 'draft').length
    const totalAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)

    setStats({ total, paid, pending, totalAmount })
  }

  const fetchInvoices = async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const userRole = user.user_metadata?.role || 'client'
      setRole(userRole)

      let query = supabase
        .from('invoices')
        .select('id, booking_id, client_id, provider_id, amount, currency, status, created_at, pdf_url')
        .order('created_at', { ascending: false })

      if (userRole === 'client') {
        query = query.eq('client_id', user.id)
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id)
      }

      const { data: invoicesData, error } = await query
      if (error) throw error
      
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
            
            return {
              ...invoice,
              serviceTitle,
              clientName: client?.full_name || 'Unknown Client',
              providerName: provider?.full_name || 'Unknown Provider'
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
              ? 'Track your payments and download receipts' 
              : 'Manage invoices and track payments from clients'
            }
          </p>
        </div>
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
                  ? 'View and download your payment receipts' 
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search invoices by service, client, or invoice ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
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
                  ? 'Invoices will appear here after successful payments.'
                  : 'Try adjusting your search criteria or filters.'
                }
              </p>
              {invoices.length === 0 && (
                <Button variant="outline" onClick={fetchInvoices}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
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
                        
                        <div className="mt-3 text-xs text-gray-500">
                          Invoice ID: {invoice.id}
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
                          <Button variant="outline" size="sm" disabled>
                            <Clock className="h-4 w-4 mr-2" />
                            Pending
                          </Button>
                        )}
                        
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
    </div>
  )
}


