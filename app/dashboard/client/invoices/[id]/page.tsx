'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Download, 
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Receipt,
  DollarSign
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import Invoice from '@/components/invoice/Invoice'
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate'

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
    requirements?: any
    service?: {
      id: string
      title: string
      description: string
      provider?: {
        id: string
        full_name: string
        email: string
        company?: {
          id: string
          name: string
          address?: string
          phone?: string
          email?: string
          website?: string
          logo_url?: string
        }
      }
    }
    client?: {
      id: string
      full_name: string
      email: string
      phone?: string
      company?: {
        id: string
        name: string
        address?: string
        phone?: string
        email?: string
        website?: string
        logo_url?: string
      }
    }
  }
}

export default function ClientInvoiceDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'modern' | 'template'>('template')

  useEffect(() => {
    checkUserAndFetchInvoice()
  }, [params.id])

  const checkUserAndFetchInvoice = async () => {
    try {
      setLoading(true)
      
      const supabase = await getSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Authentication error:', userError)
        router.push('/auth/sign-in')
        return
      }

      if (!params.id) {
        console.error('Invoice ID not available')
        toast.error('Invalid invoice ID')
        router.push('/dashboard/client/invoices')
        return
      }

      console.log('🔍 Fetching invoice for user:', user.id, 'invoice:', params.id)
      setUser(user)

      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          booking:bookings(
            id,
            status,
            requirements,
            service:services(
              id,
              title,
              description,
              provider:profiles!services_provider_id_fkey(
                id,
                full_name,
                email,
                company:companies(
                  id,
                  name,
                  address,
                  phone,
                  email,
                  website,
                  logo_url
                )
              )
            ),
            client:profiles!bookings_client_id_fkey(
              id,
              full_name,
              email,
              phone,
              company:companies(
                id,
                name,
                address,
                phone,
                email,
                website,
                logo_url
              )
            )
          )
        `)
        .eq('id', params.id)
        .eq('client_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching invoice:', error)
        console.error('Invoice ID:', params.id)
        console.error('User ID:', user.id)

        // Check if invoice exists but doesn't belong to user
        const { data: anyInvoice } = await supabase
          .from('invoices')
          .select('id, client_id')
          .eq('id', params.id)
          .single()

        if (anyInvoice) {
          console.error('Invoice exists but belongs to different client:', anyInvoice.client_id)
          toast.error('You do not have permission to view this invoice')
        } else {
          toast.error('Invoice not found')
        }

        router.push('/dashboard/client/invoices')
        return
      }

      console.log('✅ Invoice fetched successfully:', invoiceData.id)
      setInvoice(invoiceData)
    } catch (error) {
      console.error('Error in checkUserAndFetchInvoice:', error)
      toast.error('Failed to fetch invoice')
      router.push('/dashboard/client/invoices')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, dueDate?: string) => {
    // Calculate due date as 30 days from creation if not set
    const calculatedDueDate = dueDate || (() => {
      if (invoice) {
        const createdDate = new Date(invoice.created_at)
        return new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
      return null
    })()
    const isOverdue = status === 'issued' && calculatedDueDate && new Date(calculatedDueDate) < new Date()
    
    if (isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Overdue</Badge>
    }

    switch (status) {
      case 'paid':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Paid</Badge>
      case 'issued':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />Pending Payment</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleDownloadInvoice = async () => {
    if (!invoice) return

    try {
      console.log('📄 Downloading PDF for invoice:', invoice.id, invoice.invoice_number)
      
      const response = await fetch('/api/invoices/generate-template-pdf', {
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

  const handlePayInvoice = () => {
    // Navigate to payment page
    router.push(`/dashboard/client/invoices/${invoice?.id}/pay`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Invoice not found</h3>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => router.push('/dashboard/client/invoices')}>
            Back to Invoices
          </Button>
        </div>
      </div>
    )
  }

  // Helper function to get display values
  const getClientName = () => {
    return invoice.booking?.client?.full_name || 
           invoice.client_name || 
           invoice.booking?.client?.company?.name || 
           'Client Information'
  }

  const getProviderName = () => {
    return invoice.booking?.service?.provider?.full_name || 
           invoice.booking?.service?.provider?.company?.name || 
           invoice.provider_name || 
           'Service Provider'
  }

  const getServiceTitle = () => {
    return invoice.booking?.service?.title || 
           invoice.service_title || 
           'Professional Service'
  }

  const getServiceDescription = () => {
    return invoice.booking?.service?.description || 
           invoice.service_description || 
           'High-quality professional service delivered with excellence'
  }

  const getDueDate = () => {
    if (invoice.due_date) {
      return formatDate(invoice.due_date)
    }
    // Calculate due date as 30 days from creation if not set
    const createdDate = new Date(invoice.created_at)
    const dueDate = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    return formatDate(dueDate.toISOString())
  }

  const formatInvoiceNumber = (invoiceNumber?: string) => {
    if (!invoiceNumber) return `INV-${invoice.id.slice(-8).toUpperCase()}`
    return invoiceNumber.startsWith('INV-') ? invoiceNumber : `INV-${invoiceNumber}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
                <p className="text-gray-600 mt-1">{formatInvoiceNumber(invoice.invoice_number)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(invoice.status, invoice.due_date)}
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'template' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('template')}
                  className="text-xs"
                >
                  Template
                </Button>
                <Button
                  variant={viewMode === 'modern' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('modern')}
                  className="text-xs"
                >
                  Modern
                </Button>
              </div>
              
              <Button 
                onClick={handleDownloadInvoice} 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {invoice.status === 'issued' && (
                <Button 
                  onClick={handlePayInvoice} 
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Conditional Invoice Display */}
        {viewMode === 'template' ? (
          <InvoiceTemplate 
            invoice={{
              id: invoice.id,
              invoice_number: formatInvoiceNumber(invoice.invoice_number),
              issued_date: invoice.created_at,
              due_date: invoice.due_date || (() => {
                const createdDate = new Date(invoice.created_at)
                return new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
              })(),
              subtotal: invoice.subtotal || invoice.amount,
              tax_rate: invoice.vat_percent ? invoice.vat_percent / 100 : 0.05,
              tax_amount: invoice.vat_amount || (invoice.subtotal || invoice.amount) * 0.05,
              total: invoice.total_amount || (invoice.subtotal || invoice.amount) * 1.05,
              status: invoice.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
              currency: invoice.currency || 'USD',
              notes: invoice.notes,
              company_id: invoice.booking?.service?.provider?.company?.id || '1',
              client_id: invoice.client_id,
              created_at: invoice.created_at,
              updated_at: invoice.updated_at,
              company: {
                id: invoice.booking?.service?.provider?.company?.id || '1',
                name: invoice.booking?.service?.provider?.company?.name || invoice.company_name || 'Your Company Name',
                address: invoice.booking?.service?.provider?.company?.address || '123 Anywhere St., Any City, ST 12345',
                phone: invoice.booking?.service?.provider?.company?.phone || '123-456-7890',
                email: invoice.booking?.service?.provider?.company?.email || invoice.booking?.service?.provider?.email || 'hello@reallygreatsite.com',
                website: invoice.booking?.service?.provider?.company?.website || 'reallygreatsite.com',
                logo_url: invoice.booking?.service?.provider?.company?.logo_url || undefined,
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              },
              client: {
                id: invoice.client_id,
                full_name: invoice.booking?.client?.full_name || invoice.client_name || 'Client Information',
                email: invoice.booking?.client?.email || invoice.client_email || 'client@company.com',
                phone: invoice.booking?.client?.phone || '123-456-7890',
                company: {
                  id: invoice.booking?.client?.company?.id || '2',
                  name: invoice.booking?.client?.company?.name || invoice.client_name || 'Client Company',
                  address: invoice.booking?.client?.company?.address || '123 Anywhere St., Any City, ST 12345',
                  phone: invoice.booking?.client?.company?.phone || invoice.booking?.client?.phone || '123-456-7890',
                  email: invoice.booking?.client?.company?.email || invoice.booking?.client?.email || invoice.client_email || 'client@company.com',
                  website: invoice.booking?.client?.company?.website || 'clientcompany.com',
                  logo_url: invoice.booking?.client?.company?.logo_url || undefined,
                  created_at: invoice.created_at,
                  updated_at: invoice.updated_at
                },
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              },
              items: [{
                id: '1',
                invoice_id: invoice.id,
                product: getServiceTitle(),
                description: getServiceDescription(),
                qty: 1,
                unit_price: invoice.subtotal || invoice.amount,
                total: invoice.subtotal || invoice.amount,
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              }]
            }}
            className="mb-8"
          />
        ) : (
          <Invoice 
            invoiceId={invoice.id}
            className="mb-8"
            showPrintButton={true}
            onPrint={() => {
              console.log('Print button clicked')
              window.print()
            }}
          />
        )}

        {/* Additional Actions Section */}
        <div className="mt-8 flex justify-center gap-4">
          {invoice.status === 'issued' && (
            <Button 
              onClick={handlePayInvoice} 
              className="flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white py-3 px-6 text-lg font-semibold"
            >
              <CreditCard className="h-5 w-5" />
              Pay Now
            </Button>
          )}

          <Button 
            onClick={() => router.push('/dashboard/client/invoices')} 
            variant="outline"
            className="py-3 px-6 text-lg font-semibold border-2 hover:bg-gray-50"
          >
            ← Back to All Invoices
          </Button>
        </div>
      </div>
    </div>
  )
}
