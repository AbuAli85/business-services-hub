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
  DollarSign,
  Shield,
  Lock
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

export default function InvoicePaymentPage() {
  const router = useRouter()
  const params = useParams()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [processing, setProcessing] = useState(false)

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

      console.log('🔍 Fetching invoice for payment:', user.id, 'invoice:', params.id)
      setUser(user)

      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
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
        toast.error('Invoice not found')
        router.push('/dashboard/client/invoices')
        return
      }

      if (invoiceData.status === 'paid') {
        toast.error('This invoice has already been paid')
        router.push(`/dashboard/client/invoices/${params.id}`)
        return
      }

      console.log('✅ Invoice fetched successfully for payment:', invoiceData.id)
      setInvoice(invoiceData)
    } catch (error) {
      console.error('Error in checkUserAndFetchInvoice:', error)
      toast.error('Failed to fetch invoice')
      router.push('/dashboard/client/invoices')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get display values
  const getClientName = () => {
    return invoice?.booking?.client?.full_name || 
           invoice?.booking?.client?.company?.name || 
           invoice?.client_name || 
           'Client Information'
  }

  const getProviderName = () => {
    return invoice?.booking?.service?.provider?.full_name || 
           invoice?.booking?.service?.provider?.company?.name || 
           invoice?.provider_name || 
           'Service Provider'
  }

  const getServiceTitle = () => {
    return invoice?.booking?.service?.title || 
           invoice?.service_title || 
           'Professional Service'
  }

  const getDueDate = () => {
    if (invoice?.due_date) {
      return formatDate(invoice.due_date)
    }
    const createdDate = new Date(invoice?.created_at || '')
    const dueDate = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    return formatDate(dueDate.toISOString())
  }

  const formatInvoiceNumber = (invoiceNumber?: string) => {
    if (!invoiceNumber) return `INV-${invoice?.id.slice(-8).toUpperCase()}`
    return invoiceNumber.startsWith('INV-') ? invoiceNumber : `INV-${invoiceNumber}`
  }

  const handlePayment = async () => {
    if (!invoice) return

    setProcessing(true)
    try {
      // Simulate payment processing
      console.log('💳 Processing payment for invoice:', invoice.id)
      
      // In a real implementation, integrate with payment gateway (Stripe, PayPal, etc.)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate API call
      
      // Update invoice status to paid
      const supabase = await getSupabaseClient()
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'credit_card'
        })
        .eq('id', invoice.id)

      if (updateError) {
        console.error('Error updating invoice:', updateError)
        toast.error('Payment processed but failed to update invoice status')
        return
      }

      toast.success('Payment processed successfully!')
      router.push(`/dashboard/client/invoices/${invoice.id}`)
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CreditCard className="h-8 w-8 animate-pulse mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading payment page...</p>
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
                Back to Invoice
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Payment</h1>
                <p className="text-gray-600 mt-1">{formatInvoiceNumber(invoice.invoice_number)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending Payment
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Summary */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="text-2xl font-bold text-white">
                  Payment Summary
                </CardTitle>
                <CardDescription className="text-blue-100">
                  {getServiceTitle()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-4 border-b border-gray-200">
                    <span className="text-lg font-medium text-gray-900">Service Amount</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-4 bg-gray-50 px-4 rounded-lg">
                    <span className="text-xl font-bold text-gray-900">Total Amount</span>
                    <span className="text-3xl font-bold text-blue-600">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>Due Date: {getDueDate()}</p>
                    <p>Invoice Date: {formatDate(invoice.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="border-2 border-blue-200 bg-blue-50 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                      <span className="font-semibold text-lg">Credit/Debit Card</span>
                      <Badge variant="default" className="bg-blue-600">Recommended</Badge>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Secure payment processing with industry-standard encryption
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Shield className="h-4 w-4" />
                      <span>256-bit SSL encryption</span>
                      <Lock className="h-4 w-4 ml-4" />
                      <span>PCI DSS compliant</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="h-6 w-6 text-gray-600" />
                      <span className="font-semibold text-lg">Bank Transfer</span>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Direct bank transfer (processing time: 1-3 business days)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Actions */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Receipt className="h-6 w-6" />
                  Complete Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </div>
                    <p className="text-gray-600">Total amount to be paid</p>
                  </div>

                  <Separator />

                  <Button 
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold"
                  >
                    {processing ? (
                      <>
                        <Clock className="h-5 w-5 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Pay Now
                      </>
                    )}
                  </Button>

                  <div className="text-xs text-gray-500 text-center">
                    By clicking "Pay Now", you agree to our terms of service and privacy policy
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice #</span>
                    <span className="font-semibold">{formatInvoiceNumber(invoice.invoice_number)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service</span>
                    <span className="font-semibold">{getServiceTitle()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider</span>
                    <span className="font-semibold">{getProviderName()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date</span>
                    <span className="font-semibold">{getDueDate()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="border-0 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Secure Payment</h4>
                    <p className="text-sm text-blue-800">
                      Your payment information is encrypted and secure. We never store your card details.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
