'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  FileText, 
  DollarSign, 
  Calendar,
  User, 
  Building2, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  CreditCard,
  Mail,
  ChevronDown,
  Receipt,
  Plus,
  Trash2,
  Layout
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getSupabaseClient } from '@/lib/supabase'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

import { logger } from '@/lib/logger'
interface InvoiceRecord {
  id: string
  booking_id: string
  client_id: string
  provider_id: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'void' | 'overdue'
  created_at: string
  pdf_url?: string | null
  due_date?: string
  isOverdue?: boolean
  // Enriched properties
  serviceTitle?: string
  clientName?: string
  providerName?: string
  clientEmail?: string
  providerEmail?: string
  clientPhone?: string
  providerPhone?: string
  providerCompany?: string
  invoice_number?: string
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
  // Trend data
  totalTrend?: number
  paidTrend?: number
  pendingTrend?: number
  revenueTrend?: number
}

interface UnifiedInvoiceManagementProps {
  userRole: 'client' | 'provider' | 'admin'
  userId: string
}

export default function UnifiedInvoiceManagement({ userRole, userId }: UnifiedInvoiceManagementProps) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
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
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [amountRange, setAmountRange] = useState('all')
  const [clientProviderFilter, setClientProviderFilter] = useState('')
  
  // Bulk operations
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  
  // UI state
  const [showFilters, setShowFilters] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null)

  useEffect(() => {
    fetchInvoices()
  }, [userId, userRole])

  useEffect(() => {
    filterAndSortInvoices()
  }, [invoices, searchTerm, statusFilter, dateRange, serviceFilter, amountRange, clientProviderFilter])

  useEffect(() => {
    if (selectAll) {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)))
    } else {
      setSelectedInvoices(new Set())
    }
  }, [selectAll, filteredInvoices])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      
      // Add timeout and retry logic for the invoices API call
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      let retryCount = 0
      const maxRetries = 3
      let lastError: Error | null = null
      
      while (retryCount <= maxRetries) {
        try {
          // Use the proper API endpoint that includes all relationships
          const response = await fetch(`/api/invoices?role=${userRole}&userId=${userId}`, {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
          
          clearTimeout(timeoutId)
          
          if (!response.ok) {
            if (response.status === 504 && retryCount < maxRetries) {
              logger.warn(`⚠️ Invoice API returned 504, retrying... (${retryCount + 1}/${maxRetries})`)
              retryCount++
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
              continue
            }
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          
          const data = await response.json()
          const invoicesData = data.invoices || []
          
          logger.debug('📊 Fetched invoices:', invoicesData.length, 'invoices')
          
          // Enrich invoice data with additional calculations
          const enrichedInvoices = await Promise.all(invoicesData.map(async (invoice: any) => {
            // Calculate due date and overdue status
            const dueDate = invoice.due_date || (() => {
              const createdDate = new Date(invoice.created_at)
              createdDate.setDate(createdDate.getDate() + 30) // 30 days default
              return createdDate.toISOString()
            })()

            const isOverdue = invoice.status === 'issued' && new Date(dueDate) < new Date()

            // Fetch client and provider names separately for reliability
            let clientName = 'Unknown Client'
            let clientEmail = null
            let clientPhone = null
            let clientCompany = null
            let providerName = 'Unknown Provider'
            let providerEmail = null
            let providerPhone = null
            let providerCompany = null

            try {
              // Fetch client profile
              if (invoice.client_id) {
                const clientResponse = await fetch(`/api/profiles/search?id=${invoice.client_id}`)
                if (clientResponse.ok) {
                  const clientData = await clientResponse.json()
                  if (clientData.profiles && clientData.profiles.length > 0) {
                    const client = clientData.profiles[0]
                    clientName = client.full_name || 'Unknown Client'
                    clientEmail = client.email
                    clientPhone = client.phone
                    clientCompany = client.company_name
                  }
                }
              }

              // Fetch provider profile
              if (invoice.provider_id) {
                const providerResponse = await fetch(`/api/profiles/search?id=${invoice.provider_id}`)
                if (providerResponse.ok) {
                  const providerData = await providerResponse.json()
                  if (providerData.profiles && providerData.profiles.length > 0) {
                    const provider = providerData.profiles[0]
                    providerName = provider.full_name || 'Unknown Provider'
                    providerEmail = provider.email
                    providerPhone = provider.phone
                    providerCompany = provider.company_name
                  }
                }
              }
            } catch (error) {
              logger.warn('Error fetching profile data for invoice:', invoice.id, error)
              // Keep default values if fetch fails
            }

            return {
              ...invoice,
              serviceTitle: invoice.service_title || 'Service',
              clientName,
              providerName,
              clientEmail,
              providerEmail,
              clientPhone,
              providerPhone,
              providerCompany,
              due_date: dueDate,
              isOverdue,
              invoice_number: invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`
            }
          }))
          
          setInvoices(enrichedInvoices)
          calculateStats(enrichedInvoices)
          
          logger.debug('✅ Invoices loaded successfully:', enrichedInvoices.length)
          return // Success, exit retry loop
          
        } catch (error: any) {
          lastError = error
          clearTimeout(timeoutId)
          
          if (error.name === 'AbortError') {
            logger.warn('⚠️ Invoice API request was aborted due to timeout')
            break
          }
          
          if (retryCount < maxRetries) {
            logger.warn(`⚠️ Invoice API error, retrying... (${retryCount + 1}/${maxRetries}):`, error.message)
            retryCount++
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
          } else {
            break
          }
        }
      }
      
      // If we get here, all retries failed
      if (lastError) {
        throw lastError
      }
      
    } catch (error) {
      logger.error('❌ Error fetching invoices after retries:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invoices'
      setError(errorMessage)
      setRetryCount(prev => prev + 1)
      toast.error(`Failed to fetch invoices: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setRetryCount(0)
    fetchInvoices()
  }

  const calculateStats = (invoicesData: InvoiceRecord[]) => {
    const total = invoicesData.length
    const paid = invoicesData.filter(inv => inv.status === 'paid').length
    const pending = invoicesData.filter(inv => inv.status === 'issued').length
    const overdue = invoicesData.filter(inv => inv.isOverdue).length

    const totalAmount = invoicesData.reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const paidAmount = invoicesData
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const pendingAmount = invoicesData
      .filter(inv => inv.status === 'issued')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)
    const overdueAmount = invoicesData
      .filter(inv => inv.isOverdue)
      .reduce((sum, inv) => sum + (inv.amount || 0), 0)

    setStats({
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      // Trends should be calculated from previous period data
      totalTrend: 0,
      paidTrend: 0,
      pendingTrend: 0,
      revenueTrend: 0
    })
  }

  const filterAndSortInvoices = () => {
    let filtered = [...invoices]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.serviceTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(invoice => invoice.isOverdue)
      } else {
        filtered = filtered.filter(invoice => invoice.status === statusFilter)
      }
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.created_at)
        switch (dateRange) {
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

    // Amount range filter
    if (amountRange !== 'all') {
      filtered = filtered.filter(invoice => {
        const amount = invoice.amount || 0
        switch (amountRange) {
          case '0-100':
            return amount >= 0 && amount <= 100
          case '100-500':
            return amount > 100 && amount <= 500
          case '500-1000':
            return amount > 500 && amount <= 1000
          case '1000+':
            return amount > 1000
          default:
            return true
        }
      })
    }

    // Client/Provider filter
    if (clientProviderFilter) {
      filtered = filtered.filter(invoice => {
        if (userRole === 'client') {
          return invoice.providerName?.toLowerCase().includes(clientProviderFilter.toLowerCase())
        } else {
          return invoice.clientName?.toLowerCase().includes(clientProviderFilter.toLowerCase())
        }
      })
    }

    setFilteredInvoices(filtered)
  }

  const getStatusBadge = (status: string, isOverdue?: boolean) => {
    if (isOverdue) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Overdue
        </Badge>
      )
    }

    const statusConfig = {
      paid: { label: 'Paid', variant: 'default' as const, icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-200' },
      issued: { label: 'Pending', variant: 'secondary' as const, icon: Clock, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      draft: { label: 'Draft', variant: 'outline' as const, icon: FileText, className: 'bg-gray-100 text-gray-800 border-gray-200' },
      void: { label: 'Void', variant: 'destructive' as const, icon: XCircle, className: 'bg-red-100 text-red-800 border-red-200' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    const Icon = config.icon

    return (
      <Badge className={`${config.className} border flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getTrendIcon = (trend?: number) => {
    if (!trend) return null
    return trend > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const getTrendColor = (trend?: number) => {
    if (!trend) return 'text-gray-500'
    return trend > 0 ? 'text-green-600' : 'text-red-600'
  }

  const handleBulkExport = async (format: 'pdf' | 'csv') => {
    if (selectedInvoices.size === 0) {
      toast.error('Please select invoices to export')
      return
    }

    const selectedInvoicesData = filteredInvoices.filter(inv => selectedInvoices.has(inv.id))
    
    if (format === 'csv') {
      const csvData = selectedInvoicesData.map(invoice => ({
        'Invoice Number': invoice.invoice_number,
        'Service': invoice.serviceTitle,
        'Client': invoice.clientName,
        'Provider': invoice.providerName,
        'Amount': formatCurrency(invoice.amount, invoice.currency),
        'Status': invoice.status,
        'Due Date': formatDate(invoice.due_date || ''),
        'Created': formatDate(invoice.created_at)
      }))

      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success(`Exported ${selectedInvoices.size} invoices to CSV`)
    } else {
      // Export as JSON for now (PDF generation requires additional library)
      const selectedData = filteredInvoices.filter(inv => selectedInvoices.has(inv.id))
      const jsonData = JSON.stringify(selectedData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoices-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success(`Exported ${selectedInvoices.size} invoices to JSON`)
    }
  }

  const handleBulkReminder = async () => {
    if (selectedInvoices.size === 0) {
      toast.error('Please select invoices to send reminders')
      return
    }

    if (userRole !== 'provider') {
      toast.error('Only providers can send reminders')
      return
    }

    const selectedInvoicesData = filteredInvoices.filter(inv => selectedInvoices.has(inv.id))
    
    for (const invoice of selectedInvoicesData) {
      if (invoice.clientEmail) {
        try {
          await fetch('/api/notifications/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: invoice.clientEmail,
              subject: `Payment reminder for invoice ${invoice.invoice_number}`,
              text: `Dear ${invoice.clientName},\n\nThis is a friendly reminder that invoice ${invoice.invoice_number} for ${formatCurrency(invoice.amount, invoice.currency)} is due.\n\nThank you.`
            })
          })
        } catch (error) {
          logger.error('Error sending reminder:', error)
        }
      }
    }
    
    toast.success(`Sent reminders for ${selectedInvoices.size} invoices`)
  }

  const handleGeneratePDF = async (invoice: InvoiceRecord) => {
    try {
      const response = await fetch('/api/invoices/generate-template-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      })
      
      if (response.ok) {
        // Get the PDF blob from the response
        const blob = await response.blob()
        
        // Create a download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoice.invoice_number || invoice.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        
        toast.success('PDF downloaded successfully')
      } else {
        const errorData = await response.json()
        logger.error('PDF generation failed:', errorData)
        toast.error(`Failed to generate PDF: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      logger.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  const handleDownloadPDF = async (invoice: InvoiceRecord) => {
    try {
      // Try to download existing PDF first
      const response = await fetch(`/api/invoices/pdf/${invoice.id}`, {
        method: 'GET'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoice.invoice_number || invoice.id}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success('PDF downloaded successfully')
      } else {
        // If no existing PDF, generate one
        await handleGeneratePDF(invoice)
      }
    } catch (error) {
      logger.error('Error downloading PDF:', error)
      // Fallback to generating PDF
      await handleGeneratePDF(invoice)
    }
  }

  const handlePayInvoice = (invoice: InvoiceRecord) => {
    // Navigate to invoice details where payment can be processed
    window.location.href = `/dashboard/invoices/template/${invoice.id}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoices...</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">Retry attempt: {retryCount}</p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Invoices</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} variant="default" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
            </div>
            {retryCount > 0 && (
              <p className="text-sm text-red-500 mt-3">
                This is retry attempt {retryCount}. If the issue persists, please contact support.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices & Receipts</h1>
            <p className="text-gray-600 mt-2">
              {userRole === 'client' 
                ? 'View invoices issued by providers and download receipts'
                : 'Manage invoices and track payments from clients'
              }
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={fetchInvoices} 
              variant="outline" 
              className="flex items-center gap-2"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {userRole !== 'client' && (
              <Button 
                onClick={() => {
                  // Navigate to bookings page to create invoices
                  window.location.href = '/dashboard/bookings'
                }}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                View Bookings
              </Button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    {userRole === 'client' ? 'Total Received' : 'Total Issued'}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                  {stats.totalTrend && (
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(stats.totalTrend)}`}>
                      {getTrendIcon(stats.totalTrend)}
                      <span>{Math.abs(stats.totalTrend).toFixed(1)}% vs last month</span>
                    </div>
                  )}
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
                  {stats.paidTrend && (
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(stats.paidTrend)}`}>
                      {getTrendIcon(stats.paidTrend)}
                      <span>{Math.abs(stats.paidTrend).toFixed(1)}% vs last month</span>
                    </div>
                  )}
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
                  {stats.pendingTrend && (
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(stats.pendingTrend)}`}>
                      {getTrendIcon(stats.pendingTrend)}
                      <span>{Math.abs(stats.pendingTrend).toFixed(1)}% vs last month</span>
                    </div>
                  )}
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Overdue</p>
                  <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          {userRole !== 'client' && (
            <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(stats.totalAmount, 'OMR')}
                    </p>
                    {stats.revenueTrend && (
                      <div className={`flex items-center gap-1 text-sm ${getTrendColor(stats.revenueTrend)}`}>
                        {getTrendIcon(stats.revenueTrend)}
                        <span>{Math.abs(stats.revenueTrend).toFixed(1)}% vs last month</span>
                      </div>
                    )}
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          )}
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
                  {userRole === 'client' 
                    ? 'Issued invoices from providers. Download receipts when available.' 
                    : 'Manage invoices and track client payments'
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {filteredInvoices.length} of {invoices.length} invoices
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Basic Filters */}
            <div className="flex flex-col xl:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={userRole === 'client' ? 'Search by service or invoice ID...' : 'Search invoices by service, client, or invoice ID...'}
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
                    <SelectItem value="issued">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    {userRole !== 'client' && <SelectItem value="draft">Draft</SelectItem>}
                    {userRole !== 'client' && <SelectItem value="void">Void</SelectItem>}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setDateRange('all')
                    setServiceFilter('all')
                    setAmountRange('all')
                    setClientProviderFilter('')
                  }}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date Range</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
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

                <div>
                  <label className="text-sm font-medium mb-2 block">Amount Range</label>
                  <Select value={amountRange} onValueChange={setAmountRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Amounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Amounts</SelectItem>
                      <SelectItem value="0-100">$0 - $100</SelectItem>
                      <SelectItem value="100-500">$100 - $500</SelectItem>
                      <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                      <SelectItem value="1000+">$1,000+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {userRole === 'client' ? 'Provider Name' : 'Client Name'}
                  </label>
                  <Input
                    placeholder={`Search by ${userRole === 'client' ? 'provider' : 'client'} name...`}
                    value={clientProviderFilter}
                    onChange={(e) => setClientProviderFilter(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Service Type</label>
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Services" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      {/* Service options would be populated from actual services */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-800">
                  {selectedInvoices.size} invoice{selectedInvoices.size === 1 ? '' : 's'} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkExport('csv')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  {userRole === 'provider' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkReminder}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Reminders
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedInvoices(new Set())}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}

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
                    ? (userRole === 'client' 
                      ? 'You will see invoices here once a provider issues them for your bookings.'
                      : 'Invoices will be automatically generated from your bookings.')
                    : 'Try adjusting your search criteria or filters.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header with Select All */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={(checked) => setSelectAll(checked === true)}
                  />
                  <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
                    <div className="col-span-3">Service</div>
                    <div className="col-span-2">{userRole === 'client' ? 'Provider' : 'Client'}</div>
                    <div className="col-span-1">Amount</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-2">Date Issued</div>
                    <div className="col-span-2">Due Date</div>
                    <div className="col-span-1">Actions</div>
                  </div>
                </div>

                {/* Invoice Rows */}
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} className={`hover:shadow-md transition-shadow ${invoice.isOverdue ? 'border-l-4 border-l-red-500 bg-red-50' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedInvoices)
                            if (checked === true) {
                              newSelected.add(invoice.id)
                            } else {
                              newSelected.delete(invoice.id)
                            }
                            setSelectedInvoices(newSelected)
                          }}
                        />
                        
                        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-3">
                            <h3 className="font-semibold text-gray-900">
                              {invoice.serviceTitle || 'Service'}
                            </h3>
                            <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
                          </div>
                          
                          <div className="col-span-2">
                            <p className="font-medium text-gray-900">
                              {userRole === 'client' ? invoice.providerName : invoice.clientName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {userRole === 'client' ? invoice.providerEmail : invoice.clientEmail}
                            </p>
                          </div>
                          
                          <div className="col-span-1">
                            <p className="font-bold text-gray-900">
                              {formatCurrency(invoice.amount || 0, invoice.currency || 'OMR')}
                            </p>
                          </div>
                          
                          <div className="col-span-1">
                            {getStatusBadge(invoice.status, invoice.isOverdue)}
                          </div>
                          
                          <div className="col-span-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{formatDate(invoice.created_at)}</span>
                            </div>
                          </div>
                          
                          <div className="col-span-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{formatDate(invoice.due_date || '')}</span>
                            </div>
                          </div>
                          
                          <div className="col-span-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedInvoice(invoice)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem onClick={() => {
                                  const templateUrl = userRole === 'client' 
                                    ? `/dashboard/client/invoices/template/${invoice.id}`
                                    : `/dashboard/invoices/template/${invoice.id}`
                                  window.open(templateUrl, '_blank')
                                }}>
                                  <Layout className="h-4 w-4 mr-2" />
                                  View Template
                                </DropdownMenuItem>
                                
                                {invoice.pdf_url ? (
                                  <DropdownMenuItem asChild>
                                    <a href={invoice.pdf_url} target="_blank" rel="noreferrer">
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </a>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleGeneratePDF(invoice)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Generate PDF
                                  </DropdownMenuItem>
                                )}
                                
                                {userRole === 'client' && invoice.status === 'issued' && (
                                  <DropdownMenuItem onClick={() => handlePayInvoice(invoice)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Pay Now
                                  </DropdownMenuItem>
                                )}
                                
                                {userRole === 'provider' && invoice.isOverdue && (
                                  <DropdownMenuItem onClick={() => {
                                    // Send reminder logic
                                    toast.success('Reminder sent!')
                                  }}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem onClick={() => {
                                  // Export single invoice as JSON
                                  const invoiceData = JSON.stringify(invoice, null, 2)
                                  const blob = new Blob([invoiceData], { type: 'application/json' })
                                  const url = URL.createObjectURL(blob)
                                  const link = document.createElement('a')
                                  link.href = url
                                  link.download = `invoice-${invoice.invoice_number || invoice.id}-${new Date().toISOString().split('T')[0]}.json`
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                  URL.revokeObjectURL(url)
                                  toast.success('Invoice exported successfully')
                                }}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
            <DialogContent className="max-w-3xl w-full">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Invoice {selectedInvoice.invoice_number}</h3>
                    <p className="text-sm text-gray-500">
                      Created {formatDate(selectedInvoice.created_at)} • {selectedInvoice.status.toUpperCase()}
                    </p>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{selectedInvoice.serviceTitle || 'Service'}</div>
                        <div className="text-gray-500">Booking {selectedInvoice.booking_id.slice(0,8)}</div>
                      </div>
                      <div className="font-semibold">{formatCurrency(selectedInvoice.amount || 0, selectedInvoice.currency || 'OMR')}</div>
                    </div>
                  </div>
                  <div className="p-4 border-t flex items-center justify-between text-sm">
                    <div className="text-gray-500">Due {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : '—'}</div>
                    <div className="text-gray-900 font-semibold">Total: {formatCurrency(selectedInvoice.amount || 0, selectedInvoice.currency || 'OMR')}</div>
                  </div>
                </div>
                {selectedInvoice.isOverdue && userRole === 'provider' && (
                  <div className="flex items-center justify-between rounded-lg border p-4 bg-red-50 border-red-200">
                    <div className="text-sm text-red-700">This invoice is overdue. Consider sending a reminder.</div>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        toast.success('Reminder sent!')
                        setSelectedInvoice(null)
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
    </TooltipProvider>
  )
}
