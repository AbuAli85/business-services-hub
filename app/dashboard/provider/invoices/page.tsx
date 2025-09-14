'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Plus,
  Search,
  FileText,
  Eye,
  Edit,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoice_number?: string
  amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
  created_at: string
  due_date?: string
  service_title?: string
  booking?: {
    client?: {
      full_name?: string
      company?: {
        name?: string
      }
    }
    service?: {
      title?: string
    }
  } | null
}

export default function ProviderInvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const supabase = await getSupabaseClient()
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.error('❌ Auth error:', authError)
        toast.error('Please sign in to view invoices')
        router.push('/auth/sign-in')
        return
      }

      // Check if user is a provider
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.error('❌ Profile fetch error:', profileError)
        toast.error('Failed to load user profile')
        router.push('/dashboard/provider')
        return
      }

      if (profile.role !== 'provider') {
        console.error('❌ Not a provider. User role:', profile.role)
        toast.error('Access denied. Provider access required.')
        router.push('/dashboard/provider')
        return
      }

      // Fetch provider's invoices
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          amount,
          currency,
          status,
          created_at,
          due_date,
          subtotal,
          tax_amount,
          total_amount,
          notes,
          booking:bookings(
            client:profiles!bookings_client_id_fkey(
              full_name,
              company:companies(name)
            ),
            service:services(title)
          )
        `)
        .eq('provider_id', user.id)
        .order('created_at', { ascending: false })

      if (invoiceError) {
        console.error('❌ Invoice fetch error:', invoiceError)
        toast.error('Failed to load invoices')
        return
      }

      // Map the data to match our interface
      const mappedInvoices = (invoiceData || []).map((invoice: any) => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        created_at: invoice.created_at,
        due_date: invoice.due_date,
        service_title: invoice.booking?.service?.title,
        booking: invoice.booking ? {
          client: invoice.booking.client ? {
            full_name: invoice.booking.client.full_name,
            company: invoice.booking.client.company ? {
              name: invoice.booking.client.company.name
            } : undefined
          } : undefined,
          service: invoice.booking.service ? {
            title: invoice.booking.service.title
          } : undefined
        } : null
      }))
      
      setInvoices(mappedInvoices)
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      toast.error('An error occurred while loading invoices')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, dueDate?: string) => {
    const now = new Date()
    const due = dueDate ? new Date(dueDate) : null
    const isOverdue = due && due < now && status !== 'paid'

    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>
      case 'issued':
        return isOverdue ? 
          <Badge variant="destructive">Overdue</Badge> : 
          <Badge variant="default" className="bg-blue-100 text-blue-800">Issued</Badge>
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Paid
        </Badge>
      case 'cancelled':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Cancelled
        </Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getClientName = (invoice: Invoice) => {
    return invoice.booking?.client?.full_name || 
           invoice.booking?.client?.company?.name || 
           'Client'
  }

  const getServiceTitle = (invoice: Invoice) => {
    return invoice.service_title || 
           invoice.booking?.service?.title || 
           'Service'
  }

  const filteredInvoices = invoices.filter(invoice => {
    const searchLower = searchTerm.toLowerCase()
    return (
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      getClientName(invoice).toLowerCase().includes(searchLower) ||
      getServiceTitle(invoice).toLowerCase().includes(searchLower) ||
      invoice.status.toLowerCase().includes(searchLower)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
              <p className="text-gray-600 mt-1">Manage your service invoices</p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/provider/bookings')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search invoices by number, client, or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No invoices match your search criteria.' : 'You haven\'t created any invoices yet.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/dashboard/provider/bookings')}>
                  Create Your First Invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number || `INV-${invoice.id.slice(-6)}`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(invoice.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getClientName(invoice)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getServiceTitle(invoice)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.amount, invoice.currency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invoice.status, invoice.due_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/provider/invoices/template/${invoice.id}`)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/provider/invoices/template/${invoice.id}`)}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
