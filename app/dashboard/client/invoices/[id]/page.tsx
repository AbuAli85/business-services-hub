'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Download, 
  CreditCard,
  Calendar,
  User,
  Building2,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Receipt,
  DollarSign
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

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
                  logo_url
                )
              )
            ),
            client:profiles!bookings_client_id_fkey(
              id,
              full_name,
              email,
              company:companies(
                id,
                name,
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
    const isOverdue = status === 'issued' && dueDate && new Date(dueDate) < new Date()
    
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Professional Invoice Header */}
            <Card className="shadow-lg border-0 bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl font-bold text-white">
                      {formatInvoiceNumber(invoice.invoice_number)}
                    </CardTitle>
                    <CardDescription className="text-blue-100 text-lg mt-2">
                      {getServiceTitle()}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-white">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                    <div className="text-blue-100 text-lg">
                      Due: {getDueDate()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">Bill To</h4>
                        <p className="text-gray-600 font-medium text-base">{getClientName()}</p>
                        <p className="text-gray-500 text-sm">
                          {invoice.booking?.client?.email || 'client@example.com'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">Service Provider</h4>
                        <p className="text-gray-600 font-medium text-base">{getProviderName()}</p>
                        <p className="text-gray-500 text-sm">
                          {invoice.booking?.service?.provider?.email || 'provider@example.com'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Service Details */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Receipt className="h-6 w-6 text-blue-600" />
                  Service Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-gray-900 text-lg mb-2">{getServiceTitle()}</h4>
                    <p className="text-gray-700 leading-relaxed">{getServiceDescription()}</p>
                  </div>
                  
                  {invoice.booking?.requirements && (
                    <div className="bg-gray-50 p-6 rounded-lg border">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        Project Requirements
                      </h4>
                      <div className="text-sm text-gray-700 bg-white p-4 rounded border">
                        {typeof invoice.booking.requirements === 'string' 
                          ? invoice.booking.requirements 
                          : JSON.stringify(invoice.booking.requirements, null, 2)
                        }
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            {invoice.payment_terms && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{invoice.payment_terms}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {invoice.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Professional Payment Summary */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Receipt className="h-6 w-6" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600 font-medium">Service Amount</span>
                    <span className="font-bold text-lg">{formatCurrency(invoice.amount, invoice.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
                    <span className="text-gray-900 font-bold text-lg">Total Amount</span>
                    <span className="font-bold text-2xl text-green-600">{formatCurrency(invoice.amount, invoice.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Payment Status */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 font-medium">Payment Status</span>
                    {getStatusBadge(invoice.status, invoice.due_date)}
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 font-medium">Invoice Date</span>
                    <span className="font-semibold text-gray-900">{formatDate(invoice.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 font-medium">Due Date</span>
                    <span className="font-semibold text-gray-900">{getDueDate()}</span>
                  </div>
                  {invoice.paid_at && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 font-medium">Paid Date</span>
                      <span className="font-semibold text-green-600">{formatDate(invoice.paid_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Professional Actions */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Button 
                  onClick={handleDownloadInvoice} 
                  className="w-full flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
                >
                  <Download className="h-5 w-5" />
                  Download PDF Invoice
                </Button>
                
                {invoice.status === 'issued' && (
                  <Button 
                    onClick={handlePayInvoice} 
                    className="w-full flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
                  >
                    <CreditCard className="h-5 w-5" />
                    Pay Now
                  </Button>
                )}

                <Button 
                  onClick={() => router.push('/dashboard/client/invoices')} 
                  variant="outline"
                  className="w-full py-3 text-lg font-semibold border-2 hover:bg-gray-50"
                >
                  ← Back to All Invoices
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
