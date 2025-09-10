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
      const supabase = await getSupabaseClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        router.push('/auth/sign-in')
        return
      }

      setUser(user)
      await fetchInvoice()
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth/sign-in')
    }
  }

  const fetchInvoice = async () => {
    try {
      setLoading(true)
      
      if (!user?.id) {
        console.error('User ID not available')
        toast.error('Authentication required')
        router.push('/auth/sign-in')
        return
      }

      if (!params.id) {
        console.error('Invoice ID not available')
        toast.error('Invalid invoice ID')
        router.push('/dashboard/client/invoices')
        return
      }

      const supabase = await getSupabaseClient()
      
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          booking:bookings(
            id,
            status,
            requirements
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

      setInvoice(invoiceData)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Failed to fetch invoice')
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
      const response = await fetch('/api/invoices/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice-${invoice.invoice_number || invoice.id}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Invoice downloaded')
      } else {
        const errorData = await response.json()
        console.error('PDF generation error:', errorData)
        toast.error('Failed to download invoice')
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Invoice Details</h1>
                <p className="text-gray-600 mt-1">Invoice #{invoice.invoice_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(invoice.status, invoice.due_date)}
              <Button onClick={handleDownloadInvoice} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {invoice.status === 'issued' && (
                <Button onClick={handlePayInvoice} className="flex items-center gap-2">
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
            {/* Invoice Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">Invoice #{invoice.invoice_number || 'N/A'}</CardTitle>
                    <CardDescription className="text-lg">
                      {invoice.service_title || 'Service'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Due: {invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Bill To
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="font-medium">{invoice.client_name || 'Client'}</div>
                      <div>{invoice.client_email || 'N/A'}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Service Provider
                    </h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="font-medium">{invoice.provider_name || 'Provider'}</div>
                      <div>{invoice.provider_email || 'N/A'}</div>
                      {invoice.company_name && (
                        <div className="text-xs text-gray-500">{invoice.company_name}</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Service</h4>
                    <p className="text-gray-600">{invoice.service_title || 'Service'}</p>
                    {invoice.service_description && (
                      <p className="text-sm text-gray-500 mt-1">{invoice.service_description}</p>
                    )}
                  </div>
                  
                  {invoice.booking?.requirements && (
                    <div>
                      <h4 className="font-semibold text-gray-900">Requirements</h4>
                      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
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

          {/* Payment Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-medium">{formatCurrency(invoice.amount, invoice.currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.amount, invoice.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Status</span>
                    {getStatusBadge(invoice.status, invoice.due_date)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Invoice Date</span>
                    <span className="font-medium">{formatDate(invoice.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Due Date</span>
                    <span className="font-medium">{invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}</span>
                  </div>
                  {invoice.paid_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Paid Date</span>
                      <span className="font-medium">{formatDate(invoice.paid_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleDownloadInvoice} 
                  className="w-full flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                
                {invoice.status === 'issued' && (
                  <Button 
                    onClick={handlePayInvoice} 
                    className="w-full flex items-center gap-2"
                    variant="default"
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay Now
                  </Button>
                )}

                <Button 
                  onClick={() => router.push('/dashboard/client/invoices')} 
                  variant="outline"
                  className="w-full"
                >
                  Back to Invoices
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
