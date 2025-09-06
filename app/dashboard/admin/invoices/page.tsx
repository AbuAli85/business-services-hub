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
  Download,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  User,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoice_number?: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'pending'
  due_date: string
  created_at: string
  paid_at?: string
  client: {
    full_name: string
    email: string
    phone?: string
  }
  provider: {
    full_name: string
    email: string
    phone?: string
  }
  booking: {
    title: string
    service_name: string
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
  overdueAmount: number
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    overdueAmount: 0
  })

  useEffect(() => {
    loadInvoices()
  }, [])

  useEffect(() => {
    filterInvoices()
  }, [invoices, searchQuery, statusFilter])

  const loadInvoices = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // For now, create mock invoice data based on existing bookings
      // In a real system, this would come from an invoices table
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoice_number: 'INV-2025-001',
          booking_id: '71797172-3101-40e0-a2da-5fb9254b391b',
          client_id: '8520d581-692d-4e3e-b10e-7cc817af8a63',
          provider_id: 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b',
          amount: 120,
          currency: 'OMR',
          status: 'paid',
          due_date: new Date(Date.now() - 86400000 * 5).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
          paid_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          client: {
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+968 1234 5678'
          },
          provider: {
            full_name: 'Sarah Wilson',
            email: 'sarah@example.com',
            phone: '+968 9876 5432'
          },
          booking: {
            title: 'Translation Services',
            service_name: 'Translation Services'
          }
        },
        {
          id: '2',
          invoice_number: 'INV-2025-002',
          booking_id: '8ccbb969-3639-4ff4-ae4d-722d9580db57',
          client_id: '4fedc90a-1c4e-4baa-a42b-2ca85d1daf0b',
          provider_id: 'd2ce1fe9-806f-4dbc-8efb-9cf160f19e4b',
          amount: 150,
          currency: 'OMR',
          status: 'pending',
          due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          client: {
            full_name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+968 5555 1234'
          },
          provider: {
            full_name: 'Sarah Wilson',
            email: 'sarah@example.com',
            phone: '+968 9876 5432'
          },
          booking: {
            title: 'Digital Marketing',
            service_name: 'Digital Marketing'
          }
        },
        {
          id: '3',
          invoice_number: 'INV-2025-003',
          booking_id: 'test-booking-3',
          client_id: 'test-client-3',
          provider_id: 'test-provider-3',
          amount: 500,
          currency: 'OMR',
          status: 'overdue',
          due_date: new Date(Date.now() - 86400000 * 10).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
          client: {
            full_name: 'Mike Johnson',
            email: 'mike@example.com',
            phone: '+968 7777 8888'
          },
          provider: {
            full_name: 'Alex Brown',
            email: 'alex@example.com',
            phone: '+968 9999 0000'
          },
          booking: {
            title: 'Website Development',
            service_name: 'Website Development'
          }
        }
      ]

      setInvoices(mockInvoices)
      calculateStats(mockInvoices)
      setLoading(false)
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Failed to load invoices')
      setLoading(false)
    }
  }

  const calculateStats = (invoicesData: Invoice[]) => {
    const total = invoicesData.length
    const paid = invoicesData.filter(i => i.status === 'paid').length
    const pending = invoicesData.filter(i => i.status === 'pending' || i.status === 'sent').length
    const overdue = invoicesData.filter(i => i.status === 'overdue').length
    
    const totalAmount = invoicesData.reduce((sum, i) => sum + i.amount, 0)
    const paidAmount = invoicesData.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
    const pendingAmount = invoicesData.filter(i => i.status === 'pending' || i.status === 'sent').reduce((sum, i) => sum + i.amount, 0)
    const overdueAmount = invoicesData.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0)

    setStats({
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount
    })
  }

  const filterInvoices = () => {
    let filtered = [...invoices]

    if (searchQuery) {
      filtered = filtered.filter(invoice =>
        (invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.provider.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.booking.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }

    setFilteredInvoices(filtered)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, icon: FileText },
      sent: { label: 'Sent', variant: 'default' as const, icon: Clock },
      paid: { label: 'Paid', variant: 'default' as const, icon: CheckCircle },
      pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
      overdue: { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'secondary' as const, icon: FileText }
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

  const exportInvoices = () => {
    const csvData = filteredInvoices.map(invoice => ({
      'Invoice Number': invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
      'Client': invoice.client.full_name,
      'Provider': invoice.provider.full_name,
      'Service': invoice.booking.title,
      'Amount': formatCurrency(invoice.amount, invoice.currency),
      'Status': invoice.status,
      'Due Date': formatDate(invoice.due_date),
      'Created': formatDate(invoice.created_at)
    }))

    const headers = Object.keys(csvData[0] || {})
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `invoices-export-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Invoices data exported successfully')
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
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Invoice Management</h1>
            <p className="text-green-100 text-lg mb-4">
              Manage and track all invoices with comprehensive financial oversight
            </p>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                <span>Total: {stats.total}</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>Paid: {stats.paid}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                <span>Pending: {stats.pending}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span>Total: {formatCurrency(stats.totalAmount)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={loadInvoices}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              variant="secondary"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={exportInvoices}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Invoices</p>
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
                <p className="text-sm font-medium">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Pending Amount</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Manage all invoices with comprehensive client and provider details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice number, client, provider, or service..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client Details</TableHead>
                    <TableHead>Provider Details</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        <div className="flex flex-col items-center space-y-2">
                          <FileText className="h-12 w-12 opacity-50" />
                          <p className="text-lg font-medium">No invoices found</p>
                          <p className="text-sm">Try adjusting your filters or search criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-sm">
                          {invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.client.full_name}</p>
                            <p className="text-sm text-muted-foreground">{invoice.client.email}</p>
                            {invoice.client.phone && (
                              <p className="text-xs text-muted-foreground">{invoice.client.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.provider.full_name}</p>
                            <p className="text-sm text-muted-foreground">{invoice.provider.email}</p>
                            {invoice.provider.phone && (
                              <p className="text-xs text-muted-foreground">{invoice.provider.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.booking.title}</p>
                            <p className="text-sm text-muted-foreground">{invoice.booking.service_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{formatCurrency(invoice.amount, invoice.currency)}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(invoice.due_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(invoice.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Download
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
