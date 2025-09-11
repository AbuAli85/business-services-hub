'use client'

import React, { useState, useEffect } from 'react'
import type { Invoice, InvoiceProps } from '@/types/invoice'
import { fetchInvoiceData, formatCurrency, formatDate } from '@/lib/invoice-service'
import { Button } from '@/components/ui/button'
import { Printer, Download, Mail } from 'lucide-react'

export default function Invoice({ 
  invoiceId, 
  className = '', 
  showPrintButton = true,
  onPrint 
}: InvoiceProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true)
        setError(null)
        const invoiceData = await fetchInvoiceData(invoiceId)
        
        if (!invoiceData) {
          setError('Invoice not found')
          return
        }

        setInvoice(invoiceData)
      } catch (err) {
        setError('Failed to load invoice')
        console.error('Error loading invoice:', err)
      } finally {
        setLoading(false)
      }
    }

    if (invoiceId) {
      loadInvoice()
    }
  }, [invoiceId])

  const handlePrint = () => {
    if (onPrint) {
      onPrint()
    } else {
      window.print()
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/invoices/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice?.invoice_number || invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-32 bg-gray-200 rounded mb-8"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto bg-white p-8">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error || 'Invoice not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-5xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden print:shadow-none print:rounded-none ${className}`}>
      {/* Action Buttons - Hidden in print */}
      {showPrintButton && (
        <div className="flex justify-end gap-3 mb-8 print:hidden bg-gradient-to-r from-gray-50 to-gray-100 p-4 -mx-8 -mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      )}

      {/* Premium Header with Gradient */}
      <div className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white p-8 -mx-8 -mt-8 mb-8">
        {/* Decorative Pattern Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/10 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex-1">
            {/* Company Logo */}
            {invoice.company.logo_url && !invoice.company.logo_url.includes('/logo.png') && (
              <div className="mb-6">
                <img
                  src={invoice.company.logo_url}
                  alt="Company Logo"
                  className="w-20 h-20 object-contain bg-white/10 rounded-lg p-2 backdrop-blur-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
            
            {/* Company Info */}
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              {invoice.company.name}
            </h1>
            <div className="text-blue-100 text-lg font-medium mb-2">
              Professional Services & Solutions
            </div>
            <div className="text-blue-200 text-sm whitespace-pre-line leading-relaxed">
              {invoice.company.address}
            </div>
            <div className="text-blue-200 text-sm mt-3 space-x-6">
              {invoice.company.phone && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                  {invoice.company.phone}
                </span>
              )}
              {invoice.company.email && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                  {invoice.company.email}
                </span>
              )}
            </div>
          </div>

          {/* Premium Invoice Details Box */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 w-80 border border-white/20 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">INVOICE</h2>
              <div className="text-blue-200 text-sm font-medium">
                #{invoice.invoice_number}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-white/20">
                <span className="text-blue-100 font-medium">Issued Date</span>
                <span className="text-white font-semibold">{formatDate(invoice.issued_date)}</span>
              </div>
              
              {invoice.due_date && (
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-blue-100 font-medium">Due Date</span>
                  <span className="text-white font-semibold">{formatDate(invoice.due_date)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-2 border-b border-white/20">
                <span className="text-blue-100 font-medium">Status</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  invoice.status === 'paid' ? 'bg-green-500 text-white' :
                  invoice.status === 'sent' ? 'bg-blue-500 text-white' :
                  invoice.status === 'draft' ? 'bg-yellow-500 text-white' :
                  invoice.status === 'overdue' ? 'bg-red-500 text-white' :
                  invoice.status === 'cancelled' ? 'bg-gray-500 text-white' :
                  'bg-gray-500 text-white'
                }`}>
                  {invoice.status}
                </span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/30">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-white">Total Amount</span>
                <span className="text-3xl font-bold text-white">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Recipient Section */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
          <h3 className="text-slate-800 font-bold text-lg uppercase tracking-wide">
            Bill To:
          </h3>
        </div>
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-slate-900 font-bold text-xl mb-2">
                {invoice.client.full_name}
              </p>
              {invoice.client.company && (
                <p className="text-slate-700 font-semibold text-lg mb-2">
                  {invoice.client.company.name}
                </p>
              )}
              {invoice.client.company?.address && (
                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed mb-3">
                  {invoice.client.company.address}
                </p>
              )}
              <div className="flex items-center gap-2 text-slate-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <span className="text-sm font-medium">{invoice.client.email}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">
                Invoice Date
              </div>
              <div className="text-slate-700 font-bold">
                {formatDate(invoice.issued_date)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Services Table */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
          <h3 className="text-slate-800 font-bold text-xl uppercase tracking-wide">
            Services Rendered
          </h3>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                <th className="p-6 font-bold text-left text-sm uppercase tracking-wide">Service Details</th>
                <th className="p-6 font-bold text-center text-sm uppercase tracking-wide">Quantity</th>
                <th className="p-6 font-bold text-right text-sm uppercase tracking-wide">Unit Price</th>
                <th className="p-6 font-bold text-right text-sm uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr 
                  key={item.id || idx} 
                  className={`border-b border-slate-200 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  } hover:bg-blue-50/50 transition-colors duration-200`}
                >
                  <td className="p-6">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 text-lg">
                        {item.product}
                      </div>
                      {item.description && (
                        <div className="text-slate-600 text-sm leading-relaxed">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-800 font-bold rounded-lg">
                      {item.qty}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="text-slate-900 font-semibold text-lg">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="text-slate-900 font-bold text-lg">
                      {formatCurrency(item.total, invoice.currency)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Totals Section */}
      <div className="flex justify-end mb-10">
        <div className="w-96">
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-2xl border border-slate-200 shadow-lg">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-200">
                <span className="text-slate-600 font-semibold text-lg">Subtotal</span>
                <span className="font-bold text-slate-900 text-lg">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between items-center py-3 border-b border-slate-200">
                  <span className="text-slate-600 font-semibold text-lg">
                    Tax ({(invoice.tax_rate * 100).toFixed(1)}%)
                  </span>
                  <span className="font-bold text-slate-900 text-lg">
                    {formatCurrency(invoice.tax_amount, invoice.currency)}
                  </span>
                </div>
              )}
              
              <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-6 rounded-xl mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-white text-2xl font-bold">Total Amount</span>
                  <span className="text-white text-3xl font-bold">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Footer */}
      <div className="mt-16 bg-gradient-to-r from-slate-50 to-blue-50 p-8 rounded-2xl border border-slate-200 -mx-8 -mb-8">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <h4 className="text-slate-800 font-bold text-lg">Thank You for Your Business!</h4>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              We appreciate your trust in our services. This invoice was generated electronically and is valid without signature.
            </p>
            <div className="flex items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                </svg>
                <span>Confidential</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>Verified</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <p className="font-bold text-slate-800 text-lg mb-2">Business Services Hub</p>
              <p className="text-slate-600 text-sm mb-3">Professional Services & Solutions</p>
              <div className="text-xs text-slate-500 space-y-1">
                <p>© 2024 Business Services Hub</p>
                <p>All rights reserved</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Export the fetch function for use in other components
export { fetchInvoiceData }
