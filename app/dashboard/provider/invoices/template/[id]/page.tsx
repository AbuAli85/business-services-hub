'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft,
  Download, 
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Printer,
  Edit,
  Save,
  X
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
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
  booking?: any
}

export default function ProviderInvoiceTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<InvoiceData>>({})

  useEffect(() => {
    checkUserAndFetchInvoice()
  }, [params.id])

  const checkUserAndFetchInvoice = async () => {
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

      console.log('✅ User authenticated:', user.id)

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

      console.log('🔍 Fetching invoice for provider:', user.id, 'invoice:', params.id)

      // Fetch invoice data with related information
      const { data: invoiceData, error: invoiceError } = await supabase
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
            service:services(
              id,
              title,
              description,
              provider:profiles!services_provider_id_fkey(
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
        .eq('provider_id', user.id) // Only provider's own invoices
        .single()

      if (invoiceError) {
        console.error('❌ Invoice fetch error:', invoiceError)
        toast.error('Invoice not found or access denied')
        router.push('/dashboard/provider')
        return
      }

      if (!invoiceData) {
        console.error('❌ No invoice data found')
        toast.error('Invoice not found')
        router.push('/dashboard/provider')
        return
      }

      // Helper to get booking data safely for logging
      const getBookingData = () => {
        if (!invoiceData.booking) return null
        return Array.isArray(invoiceData.booking) ? invoiceData.booking[0] : invoiceData.booking
      }
      
      const bookingData = getBookingData()
      console.log('🔍 Provider company data:', (bookingData as any)?.service?.provider?.company)
      console.log('🔍 Client company data:', (bookingData as any)?.client?.company)
      console.log('🔍 Provider data:', (bookingData as any)?.service?.provider)

      setInvoice(invoiceData)
      
      const booking = bookingData
      
      setEditData({
        service_title: (booking as any)?.service?.title,
        service_description: (booking as any)?.service?.description,
        notes: invoiceData.notes,
        payment_terms: invoiceData.payment_terms,
        subtotal: invoiceData.subtotal || invoiceData.amount,
        vat_percent: (invoiceData.tax_rate || 0) / 100, // Convert percentage to decimal
        vat_amount: invoiceData.tax_amount,
        total_amount: invoiceData.total_amount || invoiceData.amount * 1.05
      })
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      toast.error('An error occurred while loading the invoice')
      router.push('/dashboard/provider')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    const booking = getBooking()
    setEditData({
      service_title: invoice?.service_title || booking?.service?.title,
      service_description: invoice?.service_description || booking?.service?.description,
      notes: invoice?.notes,
      payment_terms: invoice?.payment_terms,
      subtotal: invoice?.subtotal || invoice?.amount,
      vat_percent: invoice?.vat_percent,
      vat_amount: invoice?.vat_amount,
      total_amount: invoice?.total_amount || (invoice?.amount || 0) * 1.05
    })
  }

  const handleSave = async () => {
    if (!invoice) return

    try {
      const supabase = await getSupabaseClient()
      
      // Calculate VAT and total if subtotal changed
      const subtotal = editData.subtotal || invoice.amount
      const vatPercent = editData.vat_percent || 0.05
      const vatAmount = subtotal * vatPercent
      const totalAmount = subtotal + vatAmount

      const updateData = {
        service_title: editData.service_title,
        service_description: editData.service_description,
        notes: editData.notes,
        payment_terms: editData.payment_terms,
        subtotal: subtotal,
        vat_percent: vatPercent * 100, // Store as percentage
        vat_amount: vatAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoice.id)

      if (error) {
        console.error('❌ Update error:', error)
        toast.error('Failed to update invoice')
        return
      }

      // Update local state
      setInvoice({
        ...invoice,
        ...updateData
      })

      setIsEditing(false)
      toast.success('Invoice updated successfully!')
    } catch (error) {
      console.error('❌ Save error:', error)
      toast.error('Failed to save changes')
    }
  }

  const handlePrint = () => {
    window.print()
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
        margin: [0, 0, 0, 0] as [number, number, number, number],
        filename: `invoice-${invoice.invoice_number || invoice.id}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollY: 0,
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'avoid-all'] as const }
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

  // Helper functions to safely access booking data
  const getBooking = () => {
    if (!invoice?.booking) return null
    return Array.isArray(invoice.booking) ? invoice.booking[0] : invoice.booking
  }

  const getClientName = () => {
    const booking = getBooking()
    return booking?.client?.full_name || 
           booking?.client?.company?.name || 
           'Client Information'
  }

  const getProviderName = () => {
    const booking = getBooking()
    return booking?.service?.provider?.full_name || 
           booking?.service?.provider?.company?.name || 
           invoice?.provider_name || 
           'Service Provider'
  }

  const getServiceTitle = () => {
    const booking = getBooking()
    return editData.service_title || 
           invoice?.service_title || 
           booking?.service?.title || 
           'Service Title'
  }

  const getServiceDescription = () => {
    const booking = getBooking()
    return editData.service_description || 
           invoice?.service_description || 
           booking?.service?.description || 
           'Service Description'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => router.push('/dashboard/provider')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
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
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Invoice Template</h1>
                <p className="text-gray-600 mt-1">{formatInvoiceNumber(invoice.invoice_number)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(invoice.status, invoice.due_date)}
              
              {!isEditing ? (
                <Button 
                  onClick={handleEdit} 
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Edit className="h-4 w-4" />
                  Edit Invoice
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                </>
              )}
              
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
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form - Only visible when editing */}
      {isEditing && (
        <div className="bg-white border-b border-gray-200 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Invoice Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="service_title">Service Title</Label>
                <Input
                  id="service_title"
                  value={editData.service_title || ''}
                  onChange={(e) => setEditData({...editData, service_title: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="subtotal">Subtotal ({invoice.currency})</Label>
                <Input
                  id="subtotal"
                  type="number"
                  step="0.01"
                  value={editData.subtotal || ''}
                  onChange={(e) => setEditData({...editData, subtotal: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="service_description">Service Description</Label>
                <Textarea
                  id="service_description"
                  value={editData.service_description || ''}
                  onChange={(e) => setEditData({...editData, service_description: e.target.value})}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="vat_percent">VAT Percentage</Label>
                <Input
                  id="vat_percent"
                  type="number"
                  step="0.01"
                  value={(editData.vat_percent || 0) * 100}
                  onChange={(e) => setEditData({...editData, vat_percent: parseFloat(e.target.value) / 100 || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({...editData, notes: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Textarea
                  id="payment_terms"
                  value={editData.payment_terms || ''}
                  onChange={(e) => setEditData({...editData, payment_terms: e.target.value})}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
            subtotal: editData.subtotal || invoice.subtotal || invoice.amount,
            tax_rate: editData.vat_percent || (invoice.vat_percent ? invoice.vat_percent / 100 : 0.05),
            tax_amount: editData.vat_amount || invoice.vat_amount || ((editData.subtotal || invoice.subtotal || invoice.amount) * (editData.vat_percent || (invoice.vat_percent ? invoice.vat_percent / 100 : 0.05))),
            total: editData.total_amount || invoice.total_amount || ((editData.subtotal || invoice.subtotal || invoice.amount) * 1.05),
            status: invoice.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
            currency: invoice.currency || 'USD',
            notes: editData.notes || invoice.notes,
            company_id: invoice.booking?.service?.provider?.company?.id || '1',
            client_id: invoice.client_id,
            created_at: invoice.created_at,
            updated_at: invoice.updated_at,
            company: (() => {
              const booking = getBooking()
              const providerCompany = booking?.service?.provider?.company
              
              // Handle case where company is an array
              const companyData = Array.isArray(providerCompany) ? providerCompany[0] : providerCompany
              
              console.log('🔍 Extracted provider company:', companyData)
              
              return {
                id: companyData?.id || '1',
                name: companyData?.name || invoice.company_name || 'Your Company Name',
                address: companyData?.address || '123 Anywhere St., Any City, ST 12345',
                phone: companyData?.phone || '123-456-7890',
                email: booking?.service?.provider?.email || 'hello@reallygreatsite.com',
                website: companyData?.website || 'reallygreatsite.com',
                logo_url: companyData?.logo_url || undefined,
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              }
            })(),
            client: (() => {
              const booking = getBooking()
              const clientData = booking?.client
              const clientCompany = clientData?.company
              
              // Handle case where company is an array
              const companyData = Array.isArray(clientCompany) ? clientCompany[0] : clientCompany
              
              return {
                id: invoice.client_id,
                full_name: getClientName(),
                email: clientData?.email || invoice.client_email || 'client@company.com',
                phone: clientData?.phone || '+968-xxx-xxx',
                company: {
                  id: companyData?.id || '2',
                  name: companyData?.name || 'Client Company',
                  address: companyData?.address || '123 Anywhere St., Any City, ST 12345',
                  phone: companyData?.phone || clientData?.phone || '+968-xxx-xxx',
                  email: companyData?.email || clientData?.email || 'client@company.com',
                  website: companyData?.website || 'clientcompany.com',
                  logo_url: companyData?.logo_url || undefined,
                  created_at: invoice.created_at,
                  updated_at: invoice.updated_at
                },
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              }
            })(),
            items: [{
              id: '1',
              invoice_id: invoice.id,
              product: getServiceTitle(),
              description: getServiceDescription(),
              qty: 1,
              unit_price: editData.subtotal || invoice.subtotal || invoice.amount,
              total: editData.subtotal || invoice.subtotal || invoice.amount,
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

function formatInvoiceNumber(invoiceNumber?: string): string {
  if (!invoiceNumber) return 'INV-000000'
  return invoiceNumber.startsWith('INV-') ? invoiceNumber : `INV-${invoiceNumber}`
}
