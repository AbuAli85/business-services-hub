'use client'

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ViewModeToggle } from '@/components/ui/SegmentedControl'
import { InvoiceStatusBadge } from '@/components/ui/StatusBadge'
import { InvoiceDownloadButton } from '@/components/ui/DownloadButton'
import { EmptyState, InvoiceNotFound, LoadingError } from '@/components/ui/EmptyState'
import { useInvoice } from '@/lib/hooks/useInvoice'
import { 
  getClientName, 
  getProviderName, 
  getServiceTitle, 
  getServiceDescription,
  formatInvoiceNumber,
  canPayInvoice,
  getInvoiceTotal,
  getInvoiceSubtotal,
  getInvoiceTaxAmount,
  getInvoiceTaxRate
} from '@/lib/utils/invoiceHelpers'
import { formatDate, formatCurrency } from '@/lib/utils'
import Invoice from '@/components/invoice/Invoice'
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate'

export default function ClientInvoiceDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const [viewMode, setViewMode] = useState<'modern' | 'template'>('template')

  const { invoice, loading, error, refetch, user } = useInvoice(params.id as string, 'client')

  const handleBack = () => {
    router.push('/dashboard/client/invoices')
  }

  const handlePayNow = () => {
    if (!invoice) return
    router.push(`/dashboard/client/invoices/${invoice.id}/pay`)
  }

  const handlePrint = () => {
    window.print()
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <LoadingError 
            error={error} 
            onRetry={refetch}
          />
        </div>
      </div>
    )
  }

  // Not found state
  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <InvoiceNotFound onRetry={refetch} />
        </div>
      </div>
    )
  }

  // Debug logging
  console.log('🔍 Invoice data in component:', {
    provider: invoice.provider,
    client: invoice.client,
    company: invoice.provider?.company,
    clientCompany: invoice.client?.company,
    bookingProvider: invoice.booking?.service?.provider,
    bookingClient: invoice.booking?.client,
    fullInvoice: invoice
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Invoice {formatInvoiceNumber(invoice.invoice_number)}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <InvoiceStatusBadge invoice={invoice} />
                <span className="text-sm text-gray-600">
                  Created {formatDate(invoice.created_at)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
              />
              <InvoiceDownloadButton
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoice_number}
                variant="outline"
                size="sm"
              />
              {canPayInvoice(invoice, 'client') && (
                <Button
                  onClick={handlePayNow}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Invoice Summary</span>
              <InvoiceStatusBadge invoice={invoice} size="sm" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Bill To</h4>
                <p className="text-sm text-gray-600">{getClientName(invoice)}</p>
                <p className="text-sm text-gray-600">{invoice.client?.email || invoice.client_email}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Service Provider</h4>
                <p className="text-sm text-gray-600">{getProviderName(invoice)}</p>
                <p className="text-sm text-gray-600">{invoice.provider?.email || invoice.provider_email}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Amount</h4>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(getInvoiceTotal(invoice), invoice.currency)}
                </p>
                {invoice.due_date && (
                  <p className="text-sm text-gray-600">
                    Due {formatDate(invoice.due_date)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Content */}
        {viewMode === 'template' ? (
          (() => {
            const templateData = {
              id: invoice.id,
              invoice_number: formatInvoiceNumber(invoice.invoice_number),
              issued_date: invoice.created_at,
              due_date: invoice.due_date || (() => {
                const createdDate = new Date(invoice.created_at)
                return new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
              })(),
              subtotal: invoice.subtotal ?? invoice.amount ?? 840,
              tax_rate: invoice.vat_percent ? invoice.vat_percent / 100 : 0.05,
              tax_amount: invoice.vat_amount ?? (invoice.amount ?? 840) * 0.05,
              total: invoice.total_amount ?? invoice.amount ?? 882,
              status: invoice.status as 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled',
              currency: invoice.currency || 'USD',
              notes: invoice.notes,
              company_id: invoice.provider?.company?.id || '1',
              client_id: invoice.client_id,
              created_at: invoice.created_at,
              updated_at: invoice.updated_at,
              company: {
                id: invoice.booking?.service?.provider?.company?.[0]?.id ?? '1',
                name: invoice.booking?.service?.provider?.company?.[0]?.name ?? 'smartPRO',
                address: invoice.booking?.service?.provider?.company?.[0]?.address ?? 'PO. Box 354, PC. 133, Al Khuwair',
                phone: invoice.booking?.service?.provider?.company?.[0]?.phone ?? invoice.booking?.service?.provider?.phone ?? '95153930',
                email: invoice.booking?.service?.provider?.company?.[0]?.email ?? invoice.booking?.service?.provider?.email ?? 'luxsess2001@hotmail.com',
                website: invoice.booking?.service?.provider?.company?.[0]?.website ?? 'https://thesmartpro.io',
                logo_url: invoice.booking?.service?.provider?.company?.[0]?.logo_url ?? undefined,
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              },
              client: {
                id: invoice.client_id,
                full_name: invoice.booking?.client?.full_name ?? 'Fahad Alamri',
                email: invoice.booking?.client?.email ?? 'chairman@falconeyegroup.net',
                phone: invoice.booking?.client?.phone ?? '95153930',
                company: {
                  id: invoice.booking?.client?.company?.[0]?.id ?? '2',
                  name: invoice.booking?.client?.company?.[0]?.name ?? 'Fahad Alamri\'s Company',
                  address: invoice.booking?.client?.company?.[0]?.address ?? 'Muscat, Oman',
                  phone: invoice.booking?.client?.company?.[0]?.phone ?? invoice.booking?.client?.phone ?? '95153930',
                  email: invoice.booking?.client?.company?.[0]?.email ?? invoice.booking?.client?.email ?? 'chairman@falconeyegroup.net',
                  website: invoice.booking?.client?.company?.[0]?.website ?? 'falconeyegroup.net',
                  logo_url: invoice.booking?.client?.company?.[0]?.logo_url ?? undefined,
                  created_at: invoice.created_at,
                  updated_at: invoice.updated_at
                },
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              },
              items: [{
                id: '1',
                invoice_id: invoice.id,
                product: getServiceTitle(invoice),
                description: getServiceDescription(invoice),
                qty: 1,
                unit_price: getInvoiceSubtotal(invoice),
                total: getInvoiceSubtotal(invoice),
                created_at: invoice.created_at,
                updated_at: invoice.updated_at
              }]
            }
            
            console.log('🔍 Template data being passed:', templateData)
            return <InvoiceTemplate invoice={templateData} className="mb-8" />
          })()
        ) : (
          <Invoice 
            invoiceId={invoice.id}
            className="mb-8"
            showPrintButton={true}
            onPrint={handlePrint}
          />
        )}
      </div>
    </div>
  )
}