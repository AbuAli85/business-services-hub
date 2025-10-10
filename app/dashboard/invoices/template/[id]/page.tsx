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
import { toast } from 'sonner'
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

export default function InvoiceTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<'client' | 'provider' | 'admin'>('client')

  useEffect(() => {
    checkUserAndFetchInvoice()
  }, [params.id])

  // Debug logging for template data
  useEffect(() => {
    if (invoice) {
      console.log('🔍 Template data being passed:', {
        company: invoice.booking?.service?.provider?.company,
        client: invoice.booking?.client,
        hasProvider: !!invoice.booking?.service?.provider,
        hasClient: !!invoice.booking?.client
      })
    }
  }, [invoice])

  // Auto-download PDF when download=true parameter is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const shouldDownload = urlParams.get('download') === 'true'
    
    if (shouldDownload && invoice && !loading && !downloading) {
      // Small delay to ensure template is fully rendered
      setTimeout(() => {
        handleDownloadInvoice()
      }, 1000)
    }
  }, [invoice, loading, downloading])

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
        router.push('/dashboard/invoices')
        return
      }

      console.log('🔍 Fetching invoice for user:', user.id, 'invoice:', params.id)
      setUser(user)
      
      // Get user role
      const role = user.user_metadata?.role || 'client'
      setUserRole(role as 'client' | 'provider' | 'admin')

      // Build query based on user role - fetch all nested data
      let query = supabase
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
                phone,
                company_name
              )
            ),
            client:profiles!bookings_client_id_fkey(
              id,
              full_name,
              email,
              phone,
              company_name
            )
          )
        `)
        .eq('id', params.id)

      // Add role-based filtering
      if (role === 'client') {
        query = query.eq('client_id', user.id)
      } else if (role === 'provider') {
        query = query.eq('provider_id', user.id)
      }
      // Admin can see all invoices

      const { data: invoiceData, error } = await query.single()

      if (error) {
        console.error('Error fetching invoice:', error)
        toast.error('Invoice not found')
        router.push('/dashboard/invoices')
        return
      }

      console.log('✅ Invoice fetched successfully:', invoiceData.id)
      console.log('🔍 Invoice data structure:', {
        invoice: invoiceData,
        booking: invoiceData.booking,
        service: invoiceData.booking?.service,
        provider: invoiceData.booking?.service?.provider,
        client: invoiceData.booking?.client,
        hasProviderData: !!invoiceData.booking?.service?.provider,
        hasClientData: !!invoiceData.booking?.client
      })
      
      // Check if we need to fetch provider/client company data
      const hasProviderCompany = invoiceData.booking?.service?.provider?.company && 
                                  Object.keys(invoiceData.booking.service.provider.company).length > 2
      const hasClientCompany = invoiceData.booking?.client?.company && 
                               Object.keys(invoiceData.booking.client.company).length > 2
      
      console.log('🔍 Checking if company data fetch is needed:', {
        hasProviderData: !!invoiceData.booking?.service?.provider,
        hasProviderCompany: hasProviderCompany,
        hasClientData: !!invoiceData.booking?.client,
        hasClientCompany: hasClientCompany,
        needsProviderFetch: !hasProviderCompany && invoiceData.provider_id,
        needsClientFetch: !hasClientCompany && invoiceData.client_id,
        providerId: invoiceData.provider_id,
        clientId: invoiceData.client_id
      })

      // Enrich invoice data with full company information
      let enrichedInvoiceData = { ...invoiceData }
      
      // Always fetch provider company data if provider_id exists (since we don't query companies initially)
      if (invoiceData.provider_id && !hasProviderCompany) {
        console.log('🔍 Fetching provider data for ID:', invoiceData.provider_id)
        try {
          const providerResponse = await fetch(`/api/profiles/search?id=${invoiceData.provider_id}`)
          if (providerResponse.ok) {
            const providerData = await providerResponse.json()
            if (providerData.profiles && providerData.profiles.length > 0) {
              const provider = providerData.profiles[0]
              console.log('✅ Provider data fetched:', provider)
              
              // Extract company data from the fetched profile
              const companyData = provider.companies && Array.isArray(provider.companies) && provider.companies.length > 0
                ? provider.companies[0]
                : null
              
              console.log('📊 Provider company data:', companyData)
              
              // Merge provider data with existing data
              if (!enrichedInvoiceData.booking) {
                enrichedInvoiceData.booking = {} as any
              }
              if (!enrichedInvoiceData.booking.service) {
                enrichedInvoiceData.booking.service = {} as any
              }
              
              enrichedInvoiceData.booking.service.provider = {
                ...(enrichedInvoiceData.booking.service.provider || {}),
                id: provider.id,
                full_name: provider.full_name,
                email: provider.email,
                phone: provider.phone,
                company: companyData ? {
                  id: companyData.id,
                  name: companyData.name,
                  address: companyData.address || '123 Business Street, City, Country',
                  phone: companyData.phone || provider.phone || '+1-234-567-8900',
                  email: companyData.email || provider.email,
                  website: companyData.website || 'company-website.com',
                  logo_url: companyData.logo_url
                } : {
                  id: '1',
                  name: provider.company_name || provider.full_name + "'s Company",
                  address: '123 Business Street, City, Country',
                  phone: provider.phone || '+1-234-567-8900',
                  email: provider.email,
                  website: 'company-website.com',
                  logo_url: undefined
                }
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch provider data:', error)
        }
      }

      // Always fetch client company data if client_id exists (since we don't query companies initially)
      if (invoiceData.client_id && !hasClientCompany) {
        console.log('🔍 Fetching client data for ID:', invoiceData.client_id)
        try {
          const clientResponse = await fetch(`/api/profiles/search?id=${invoiceData.client_id}`)
          if (clientResponse.ok) {
            const clientData = await clientResponse.json()
            if (clientData.profiles && clientData.profiles.length > 0) {
              const client = clientData.profiles[0]
              console.log('✅ Client data fetched:', client)
              
              // Extract company data from the fetched profile
              const companyData = client.companies && Array.isArray(client.companies) && client.companies.length > 0
                ? client.companies[0]
                : null
              
              console.log('📊 Client company data:', companyData)
              
              // Merge client data with existing data
              if (!enrichedInvoiceData.booking) {
                enrichedInvoiceData.booking = {} as any
              }
              
              enrichedInvoiceData.booking.client = {
                ...(enrichedInvoiceData.booking.client || {}),
                id: client.id,
                full_name: client.full_name,
                email: client.email,
                phone: client.phone,
                company: companyData ? {
                  id: companyData.id,
                  name: companyData.name,
                  address: companyData.address || '123 Client Street, City, Country',
                  phone: companyData.phone || client.phone || '+1-234-567-8900',
                  email: companyData.email || client.email,
                  website: companyData.website || 'client-company.com',
                  logo_url: companyData.logo_url,
                  created_at: companyData.created_at,
                  updated_at: companyData.updated_at
                } : {
                  id: '2',
                  name: client.company_name || client.full_name + "'s Company",
                  address: '123 Client Street, City, Country',
                  phone: client.phone || '+1-234-567-8900',
                  email: client.email,
                  website: 'client-company.com',
                  logo_url: undefined,
                  created_at: invoiceData.created_at,
                  updated_at: invoiceData.updated_at
                }
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch client data:', error)
        }
      }

      setInvoice(enrichedInvoiceData)
      console.log('📊 Final enriched invoice data:', JSON.stringify(enrichedInvoiceData, null, 2))
      console.log('📊 Provider data in enriched:', enrichedInvoiceData.booking?.service?.provider)
      console.log('📊 Client data in enriched:', enrichedInvoiceData.booking?.client)
      console.log('📊 Provider company in enriched:', enrichedInvoiceData.booking?.service?.provider?.company)
      console.log('📊 Client company in enriched:', JSON.stringify(enrichedInvoiceData.booking?.client?.company, null, 2))
      
      // Additional debugging for template data
      console.log('🔍 Template data check:', {
        hasProvider: !!enrichedInvoiceData.booking?.service?.provider,
        hasProviderCompany: !!enrichedInvoiceData.booking?.service?.provider?.company,
        providerCompanyName: enrichedInvoiceData.booking?.service?.provider?.company?.name,
        providerCompanyAddress: enrichedInvoiceData.booking?.service?.provider?.company?.address,
        providerCompanyWebsite: enrichedInvoiceData.booking?.service?.provider?.company?.website,
        hasClient: !!enrichedInvoiceData.booking?.client,
        hasClientCompany: !!enrichedInvoiceData.booking?.client?.company,
        clientCompanyName: enrichedInvoiceData.booking?.client?.company?.name,
        clientCompanyAddress: enrichedInvoiceData.booking?.client?.company?.address,
        clientCompanyWebsite: enrichedInvoiceData.booking?.client?.company?.website,
        clientCompanyPhone: enrichedInvoiceData.booking?.client?.company?.phone,
        clientCompanyEmail: enrichedInvoiceData.booking?.client?.company?.email
      })
    } catch (error) {
      console.error('Error in checkUserAndFetchInvoice:', error)
      toast.error('Failed to fetch invoice')
      router.push('/dashboard/invoices')
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
    if (!invoice || downloading) return

    try {
      setDownloading(true)
      toast.loading('Generating PDF from web template...', { id: 'pdf-download' })
      console.log('📄 Converting web template to PDF for invoice:', invoice.id, invoice.invoice_number)
      
      // Get the invoice template element
      const templateElement = document.getElementById('invoice-template')
      if (!templateElement) {
        toast.error('Invoice template not found', { id: 'pdf-download' })
        return
      }

      // Use html2pdf.js to convert the web template directly to PDF
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
        pagebreak: { mode: ['css', 'avoid-all'] }
      }

      console.log('✅ Converting web template to PDF...')
      await html2pdf().set(opt).from(templateElement).save()
      
      toast.success('Invoice PDF downloaded successfully!', { id: 'pdf-download' })
      console.log('✅ PDF generated from web template successfully')
      
    } catch (error) {
      console.error('❌ Error converting web template to PDF:', error)
      toast.error('Failed to generate PDF from web template. Please try again.', { id: 'pdf-download' })
    } finally {
      setDownloading(false)
    }
  }

  const handlePayInvoice = () => {
    router.push(`/dashboard/client/invoices/${invoice?.id}/pay`)
  }

  const handlePrint = () => {
    window.print()
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
          <Button onClick={() => router.push('/dashboard/invoices')}>
            Back to Invoices
          </Button>
        </div>
      </div>
    )
  }

  // Helper functions
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
                disabled={downloading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
              
              {userRole === 'client' && invoice.status === 'issued' && (
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
      <div id="invoice-template" className="py-8">
        {(() => {
          const templateInvoice = {
            id: invoice.id,
            invoice_number: formatInvoiceNumber(invoice.invoice_number),
            issued_date: invoice.created_at,
            due_date: invoice.due_date || (() => {
              const createdDate = new Date(invoice.created_at)
              return new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })(),
            subtotal: invoice.subtotal || invoice.amount,
            vat_percent: invoice.vat_percent ? invoice.vat_percent / 100 : 0.05,
            vat_amount: invoice.vat_amount || (invoice.subtotal || invoice.amount) * 0.05,
            total: (invoice.subtotal || invoice.amount) + (invoice.vat_amount || (invoice.subtotal || invoice.amount) * 0.05),
            status: invoice.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
            currency: invoice.currency || 'USD',
            notes: invoice.notes,
            company_id: invoice.booking?.service?.provider?.company?.id || '1',
            client_id: invoice.client_id,
            created_at: invoice.created_at,
            updated_at: invoice.updated_at,
            company: {
              id: invoice.booking?.service?.provider?.company?.id || '1',
              name: invoice.booking?.service?.provider?.company?.name || invoice.booking?.service?.provider?.full_name + "'s Company" || 'Service Provider Company',
              address: invoice.booking?.service?.provider?.company?.address || 'Business Address Not Provided',
              phone: invoice.booking?.service?.provider?.company?.phone || 'Phone Not Provided',
              email: invoice.booking?.service?.provider?.company?.email || invoice.booking?.service?.provider?.email || 'Email Not Provided',
              website: invoice.booking?.service?.provider?.company?.website || 'Website Not Provided',
              logo_url: invoice.booking?.service?.provider?.company?.logo_url || undefined,
              created_at: invoice.created_at,
              updated_at: invoice.updated_at
            },
            client: {
              id: invoice.client_id,
              full_name: invoice.booking?.client?.full_name || 'Client Information',
              email: invoice.booking?.client?.email || 'client@email.com',
              phone: invoice.booking?.client?.phone || 'Phone Not Provided',
              company: {
                id: invoice.booking?.client?.company?.id || '2',
                name: invoice.booking?.client?.company?.name || invoice.booking?.client?.full_name + "'s Company" || 'Client Company',
                address: invoice.booking?.client?.company?.address || 'Client Address Not Provided',
                phone: invoice.booking?.client?.company?.phone || invoice.booking?.client?.phone || 'Phone Not Provided',
                email: invoice.booking?.client?.company?.email || invoice.booking?.client?.email || 'client@email.com',
                website: invoice.booking?.client?.company?.website || 'Website Not Provided',
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
          }
          
          console.log('🔍 Final template data being passed to InvoiceTemplate:', {
            company: templateInvoice.company,
            client: templateInvoice.client,
            providerData: invoice.booking?.service?.provider,
            clientData: invoice.booking?.client,
            clientCompanyData: invoice.booking?.client?.company,
            clientAddress: invoice.booking?.client?.company?.address,
            clientWebsite: invoice.booking?.client?.company?.website
          })
          
          return <InvoiceTemplate invoice={templateInvoice} />
        })()}
      </div>
    </div>
  )
}
