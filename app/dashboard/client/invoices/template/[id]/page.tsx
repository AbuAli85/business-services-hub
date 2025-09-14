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
  Printer
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate'
// html2pdf will be imported dynamically to avoid SSR issues

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

export default function ClientInvoiceTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    console.log('🔍 InvoiceTemplatePage useEffect triggered with params:', params)
    checkUserAndFetchInvoice()
  }, [params.id])

  const checkUserAndFetchInvoice = async () => {
    try {
      setLoading(true)
      
      console.log('🔍 Starting checkUserAndFetchInvoice with params:', params)
      
      const supabase = await getSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      console.log('🔍 Auth check result:', { user: user?.id, error: userError?.message })
      
      if (userError || !user) {
        console.error('Authentication error:', userError)
        toast.error('Please sign in to view this invoice')
        router.push('/auth/sign-in')
        return
      }

      if (!params.id) {
        console.error('Invoice ID not available')
        toast.error('Invalid invoice ID')
        router.push('/dashboard/client/invoices')
        return
      }

      console.log('🔍 Fetching invoice with ID:', params.id, 'for user:', user.id)

      console.log('🔍 Fetching invoice for client:', user.id, 'invoice:', params.id)
      setUser(user)

      // Client can only see their own invoices with proper relationships
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          id,
          booking_id,
          provider_id,
          client_id,
          amount,
          currency,
          status,
          invoice_number,
          due_date,
          subtotal,
          tax_rate,
          tax_amount,
          total_amount,
          notes,
          payment_terms,
          created_at,
          updated_at,
          booking:bookings!invoices_booking_id_fkey(
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
                phone,
                role,
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
              role,
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
        .eq('client_id', user.id) // Ensure client can only access their own invoices
        .single()

      if (error) {
        console.error('❌ Error fetching invoice:', error)
        console.error('❌ Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        if (error.code === 'PGRST116') {
          toast.error('Invoice not found or you don\'t have permission to view it')
        } else {
          toast.error(`Database error: ${error.message}`)
        }
        router.push('/dashboard/client/invoices')
        return
      }

      if (!invoiceData) {
        console.error('❌ No invoice data returned')
        toast.error('Invoice not found')
        router.push('/dashboard/client/invoices')
        return
      }

      console.log('✅ Invoice fetched successfully:', invoiceData.id)
      // Helper to get booking data safely
      const getBookingData = () => {
        if (!invoiceData.booking) return null
        return Array.isArray(invoiceData.booking) ? invoiceData.booking[0] : invoiceData.booking
      }
      
      const booking = getBookingData()
      console.log('🔍 Provider company data:', (booking as any)?.service?.provider?.company)
      console.log('🔍 Client company data:', (booking as any)?.client?.company)
      console.log('🔍 Provider data:', (booking as any)?.service?.provider)
      console.log('🔍 Service data:', (booking as any)?.service)
      setInvoice(invoiceData as any)
    } catch (error) {
      console.error('Error in checkUserAndFetchInvoice:', error)
      toast.error('Failed to fetch invoice')
      router.push('/dashboard/client/invoices')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string, dueDate?: string) => {
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

    const src = document.getElementById('invoice-template')
    if (!src) {
      toast.error('Invoice template not found')
      return
    }

    try {
      const html2pdf = (await import('html2pdf.js')).default

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `invoice-${invoice.invoice_number || invoice.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'avoid-all'] }
      }

      toast.loading('Generating PDF...')
      await html2pdf().set(opt).from(src).save()
      toast.dismiss()
      toast.success('Invoice downloaded successfully!')
    } catch (err) {
      console.error('❌ PDF export failed:', err)
      toast.dismiss()
      toast.error('Failed to generate PDF')
    }
  }

  const handlePayInvoice = () => {
    router.push(`/dashboard/client/invoices/${invoice?.id}/pay`)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleTestContent = () => {
    const src = document.getElementById('invoice-template')
    if (!src) {
      toast.error('Invoice template not found')
      return
    }
    
    console.log('🔍 Testing invoice template content...')
    console.log('🔍 Source element:', src)
    console.log('🔍 Source innerHTML length:', src.innerHTML.length)
    console.log('🔍 Source text content length:', src.textContent?.length || 0)
    console.log('🔍 Source first 1000 chars:', src.textContent?.substring(0, 1000))
    
    // Show content in an alert for debugging
    const content = src.textContent || 'No content found'
    alert(`Invoice content (first 500 chars):\n\n${content.substring(0, 500)}...`)
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
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => router.push('/dashboard/client/invoices')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </div>
    )
  }

  // Helper functions
  const getClientName = () => {
    return invoice.booking?.client?.full_name || 
           invoice.booking?.client?.company?.name || 
           invoice.client_name || 
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

  const formatInvoiceNumber = (invoiceNumber?: string) => {
    if (!invoiceNumber) return `INV-${invoice.id.slice(-8).toUpperCase()}`
    return invoiceNumber.startsWith('INV-') ? invoiceNumber : `INV-${invoiceNumber}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Hidden in print */}
      <div className="bg-white shadow-sm border-b border-gray-200 print:hidden">
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
                <h1 className="text-3xl font-bold text-gray-900">Invoice Template View</h1>
                <p className="text-gray-600 mt-1">{formatInvoiceNumber(invoice.invoice_number)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(invoice.status, invoice.due_date)}
              
              <Button 
                onClick={handlePrint} 
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
              
              <Button 
                onClick={handleDownloadInvoice} 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              
              <Button 
                onClick={handleTestContent} 
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600"
              >
                Test Content
              </Button>
              
              {/* Pay Now button - only for clients */}
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

      {/* Invoice Template */}
      <div className="py-8">
        <div id="invoice-template">
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
            company: (() => {
              const providerCompany = Array.isArray(invoice.booking?.service?.provider?.company) 
                ? invoice.booking?.service?.provider?.company?.[0] 
                : invoice.booking?.service?.provider?.company
              
              console.log('🔍 Extracted provider company:', providerCompany)
              
              return {
                id: providerCompany?.id || '1',
                name: providerCompany?.name || invoice.company_name || 'Your Company Name',
                address: providerCompany?.address || '123 Anywhere St., Any City, ST 12345',
                phone: providerCompany?.phone || '123-456-7890',
                email: invoice.booking?.service?.provider?.email || 'hello@reallygreatsite.com',
                website: providerCompany?.website || 'reallygreatsite.com',
                logo_url: providerCompany?.logo_url || undefined,
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              }
            })(),
            client: {
              id: invoice.client_id,
              full_name: getClientName(),
              email: invoice.booking?.client?.email || invoice.client_email || 'client@company.com',
              phone: (invoice.booking?.client as any)?.phone || '+968-xxx-xxx',
              company: {
                id: (Array.isArray(invoice.booking?.client?.company) 
                  ? invoice.booking?.client?.company?.[0]?.id 
                  : invoice.booking?.client?.company?.id) || '2',
                name: (Array.isArray(invoice.booking?.client?.company) 
                  ? invoice.booking?.client?.company?.[0]?.name 
                  : invoice.booking?.client?.company?.name) || 'Client Company',
                address: (Array.isArray(invoice.booking?.client?.company) 
                  ? invoice.booking?.client?.company?.[0]?.address 
                  : invoice.booking?.client?.company?.address) || '123 Anywhere St., Any City, ST 12345',
                phone: (Array.isArray(invoice.booking?.client?.company) 
                  ? invoice.booking?.client?.company?.[0]?.phone 
                  : invoice.booking?.client?.company?.phone) || (invoice.booking?.client as any)?.phone || '+968-xxx-xxx',
                email: (Array.isArray(invoice.booking?.client?.company) 
                  ? invoice.booking?.client?.company?.[0]?.email 
                  : invoice.booking?.client?.company?.email) || invoice.booking?.client?.email || 'client@company.com',
                website: (Array.isArray(invoice.booking?.client?.company) 
                  ? invoice.booking?.client?.company?.[0]?.website 
                  : invoice.booking?.client?.company?.website) || 'clientcompany.com',
                logo_url: (Array.isArray(invoice.booking?.client?.company) 
                  ? invoice.booking?.client?.company?.[0]?.logo_url 
                  : invoice.booking?.client?.company?.logo_url) || undefined,
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
        />
        </div>
      </div>
    </div>
  )
}
