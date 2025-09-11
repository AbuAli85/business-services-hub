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
      // Use safe removal to prevent DOM errors
      if (a.parentNode) {
        a.parentNode.removeChild(a)
      }
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

      {/* Ultra-Premium Header with Advanced Design */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white p-10 -mx-8 -mt-8 mb-10 overflow-hidden">
        {/* Advanced Decorative Pattern Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-transparent to-purple-600/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.1),transparent_50%)]"></div>
        
        {/* Geometric Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-400/20 to-transparent rounded-full translate-y-16 -translate-x-16"></div>
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/3 w-8 h-8 bg-blue-300/20 rounded-full"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex-1">
            {/* Enhanced Company Logo Area */}
            {invoice.company.logo_url && !invoice.company.logo_url.includes('/logo.png') && (
              <div className="mb-8">
                <div className="relative">
                  <img
                    src={invoice.company.logo_url}
                    alt="Company Logo"
                    className="w-24 h-24 object-contain bg-white/15 rounded-2xl p-3 backdrop-blur-sm border border-white/20 shadow-2xl"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-2xl blur-sm -z-10"></div>
                </div>
              </div>
            )}
            
            {/* Enhanced Company Info */}
            <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent leading-tight">
              {invoice.company.name}
            </h1>
            <div className="text-blue-100 text-xl font-semibold mb-3 tracking-wide">
              Professional Services & Solutions
            </div>
            <div className="text-blue-200 text-base whitespace-pre-line leading-relaxed mb-4">
              {invoice.company.address}
            </div>
            <div className="text-blue-200 text-base mt-4 space-y-2">
              {invoice.company.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                  </div>
                  <span className="font-medium">{invoice.company.phone}</span>
                </div>
              )}
              {invoice.company.email && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                    </svg>
                  </div>
                  <span className="font-medium">{invoice.company.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ultra-Premium Invoice Details Box */}
          <div className="bg-white/15 backdrop-blur-md rounded-3xl p-10 w-96 border border-white/30 shadow-2xl relative overflow-hidden">
            {/* Inner glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur-sm">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd"/>
                    <path d="M8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zM8 11a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                  </svg>
                </div>
                <h2 className="text-4xl font-black text-white mb-3 tracking-tight">INVOICE</h2>
                <div className="text-blue-200 text-lg font-bold tracking-wider">
                  #{invoice.invoice_number}
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="flex justify-between items-center py-3 border-b border-white/25">
                  <span className="text-blue-100 font-semibold text-lg">Issued Date</span>
                  <span className="text-white font-bold text-lg">{formatDate(invoice.issued_date)}</span>
                </div>
                
                {invoice.due_date && (
                  <div className="flex justify-between items-center py-3 border-b border-white/25">
                    <span className="text-blue-100 font-semibold text-lg">Due Date</span>
                    <span className="text-white font-bold text-lg">{formatDate(invoice.due_date)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-3 border-b border-white/25">
                  <span className="text-blue-100 font-semibold text-lg">Status</span>
                  <span className={`px-4 py-2 rounded-full text-sm font-black uppercase tracking-wide ${
                    invoice.status === 'paid' ? 'bg-green-500 text-white shadow-lg' :
                    invoice.status === 'sent' ? 'bg-blue-500 text-white shadow-lg' :
                    invoice.status === 'draft' ? 'bg-yellow-500 text-white shadow-lg' :
                    invoice.status === 'overdue' ? 'bg-red-500 text-white shadow-lg' :
                    invoice.status === 'cancelled' ? 'bg-gray-500 text-white shadow-lg' :
                    'bg-gray-500 text-white shadow-lg'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/30">
                <div className="bg-gradient-to-r from-white/20 to-white/10 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-black text-white">Total Amount</span>
                    <span className="text-4xl font-black text-white">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                </div>
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

      {/* Ultra-Premium Services Table */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-2 h-10 bg-gradient-to-b from-blue-600 via-purple-600 to-indigo-600 rounded-full shadow-lg"></div>
          <h3 className="text-slate-800 font-black text-2xl uppercase tracking-wider">
            Services Rendered
          </h3>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent"></div>
        </div>
        <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 shadow-2xl bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white">
                <th className="p-8 font-black text-left text-base uppercase tracking-wider">Service Details</th>
                <th className="p-8 font-black text-center text-base uppercase tracking-wider">Quantity</th>
                <th className="p-8 font-black text-right text-base uppercase tracking-wider">Unit Price</th>
                <th className="p-8 font-black text-right text-base uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr 
                  key={item.id || idx} 
                  className={`border-b-2 border-slate-100 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gradient-to-r from-slate-50/50 to-blue-50/30'
                  } hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-purple-50/50 transition-all duration-300 group`}
                >
                  <td className="p-8">
                    <div className="space-y-3">
                      <div className="font-black text-slate-900 text-xl group-hover:text-blue-900 transition-colors duration-300">
                        {item.product}
                      </div>
                      {item.description && (
                        <div className="text-slate-600 text-base leading-relaxed font-medium">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 font-black text-xl rounded-2xl shadow-lg border-2 border-blue-300">
                      {item.qty}
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="text-slate-900 font-black text-xl group-hover:text-blue-900 transition-colors duration-300">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="text-slate-900 font-black text-xl group-hover:text-blue-900 transition-colors duration-300">
                      {formatCurrency(item.total, invoice.currency)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ultra-Premium Totals Section */}
      <div className="flex justify-end mb-12">
        <div className="w-[28rem]">
          <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-10 rounded-3xl border-2 border-slate-200 shadow-2xl relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-center py-4 border-b-2 border-slate-200">
                <span className="text-slate-700 font-black text-xl">Subtotal</span>
                <span className="font-black text-slate-900 text-xl">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between items-center py-4 border-b-2 border-slate-200">
                  <span className="text-slate-700 font-black text-xl">
                    Tax ({(invoice.tax_rate * 100).toFixed(1)}%)
                  </span>
                  <span className="font-black text-slate-900 text-xl">
                    {formatCurrency(invoice.tax_amount, invoice.currency)}
                  </span>
                </div>
              )}
              
              <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 rounded-2xl mt-8 relative overflow-hidden">
                {/* Inner glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                <div className="relative z-10 flex justify-between items-center">
                  <span className="text-white text-3xl font-black">Total Amount</span>
                  <span className="text-white text-4xl font-black">
                    {formatCurrency(invoice.total, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ultra-Premium Footer */}
      <div className="mt-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-12 rounded-3xl border-2 border-slate-200 -mx-8 -mb-8 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-200/30 to-transparent rounded-full -translate-y-20 translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-200/30 to-transparent rounded-full translate-y-16 -translate-x-16"></div>
        
        <div className="relative z-10 flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg"></div>
              <h4 className="text-slate-800 font-black text-2xl">Thank You for Your Business!</h4>
            </div>
            <p className="text-slate-600 text-base leading-relaxed mb-6 font-medium">
              We appreciate your trust in our services. This invoice was generated electronically and is valid without signature.
            </p>
            <div className="flex items-center gap-8 text-sm text-slate-600">
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <span className="font-semibold">Secure Payment</span>
              </div>
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <span className="font-semibold">Confidential</span>
              </div>
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <span className="font-semibold">Verified</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border-2 border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p className="font-black text-slate-800 text-xl">Business Services Hub</p>
                  <p className="text-slate-600 text-sm font-semibold">Professional Services & Solutions</p>
                </div>
              </div>
              <div className="text-sm text-slate-500 space-y-1 font-medium">
                <p>© 2024 Business Services Hub</p>
                <p>All rights reserved</p>
                <p className="text-xs mt-2 text-slate-400">Powered by Advanced Technology</p>
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
