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
    <div className={`max-w-4xl mx-auto bg-white shadow-lg p-8 print:shadow-none print:p-4 ${className}`}>
      {/* Action Buttons - Hidden in print */}
      {showPrintButton && (
        <div className="flex justify-end gap-2 mb-6 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
        <div className="flex-1">
          {/* Company Logo */}
          {invoice.company.logo_url && !invoice.company.logo_url.includes('/logo.png') && (
            <img
              src={invoice.company.logo_url}
              alt="Company Logo"
              className="w-16 h-16 object-contain mb-4"
              onError={(e) => {
                // Hide the image if it fails to load
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          
          {/* Company Info */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {invoice.company.name}
          </h1>
          <div className="text-sm text-gray-600 whitespace-pre-line">
            {invoice.company.address}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {invoice.company.phone && (
              <span className="mr-4">{invoice.company.phone}</span>
            )}
            {invoice.company.email && (
              <span>{invoice.company.email}</span>
            )}
          </div>
        </div>

        {/* Invoice Details Box */}
        <div className="bg-blue-600 text-white rounded-lg p-6 w-64 text-sm">
          <h2 className="text-xl font-bold mb-4">Invoice #{invoice.invoice_number}</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-blue-100">Issued</span>
              <span className="font-medium">{formatDate(invoice.issued_date)}</span>
            </div>
            
            {invoice.due_date && (
              <div className="flex justify-between">
                <span className="text-blue-100">Due</span>
                <span className="font-medium">{formatDate(invoice.due_date)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-blue-100">Status</span>
              <span className="font-medium uppercase">{invoice.status}</span>
            </div>
          </div>
          
          <div className="flex justify-between mt-4 pt-4 border-t border-blue-500">
            <span className="text-lg font-bold">Total</span>
            <span className="text-lg font-bold">
              {formatCurrency(invoice.total, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Recipient Section */}
      <div className="mb-8">
        <h3 className="text-gray-700 font-bold text-sm uppercase tracking-wide mb-2">
          Bill To:
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-900 font-semibold text-lg">
            {invoice.client.full_name}
          </p>
          {invoice.client.company && (
            <p className="text-gray-700 font-medium">
              {invoice.client.company.name}
            </p>
          )}
          {invoice.client.company?.address && (
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {invoice.client.company.address}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            {invoice.client.email}
          </p>
        </div>
      </div>

      {/* Services Table */}
      <div className="mb-8">
        <h3 className="text-gray-800 font-bold text-lg mb-4">For Services Rendered</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-left">
                <th className="p-4 font-semibold">Product / Service</th>
                <th className="p-4 font-semibold">Description</th>
                <th className="p-4 font-semibold text-center">Qty</th>
                <th className="p-4 font-semibold text-right">Unit Price</th>
                <th className="p-4 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => (
                <tr 
                  key={item.id || idx} 
                  className={`border-b border-gray-200 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="p-4 font-medium text-gray-900">
                    {item.product}
                  </td>
                  <td className="p-4 text-gray-600">
                    {item.description}
                  </td>
                  <td className="p-4 text-center text-gray-900">
                    {item.qty}
                  </td>
                  <td className="p-4 text-right text-gray-900">
                    {formatCurrency(item.unit_price, invoice.currency)}
                  </td>
                  <td className="p-4 text-right font-medium text-gray-900">
                    {formatCurrency(item.total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-8">
        <div className="w-80 text-sm">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(invoice.subtotal, invoice.currency)}
              </span>
            </div>
            
            {invoice.tax_rate > 0 && (
              <>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">
                    Tax ({(invoice.tax_rate * 100).toFixed(1)}%)
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(invoice.tax_amount, invoice.currency)}
                  </span>
                </div>
              </>
            )}
            
            <div className="flex justify-between py-3 border-t border-gray-300 mt-2">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 flex justify-between items-center text-sm text-gray-500 border-t border-gray-200 pt-6">
        <div>
          <p className="font-medium text-gray-700">Thank you for your business!</p>
          <p className="text-xs mt-1">
            This invoice was generated electronically and is valid without signature.
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-600">Powered by Business Services Hub</p>
          <p className="text-xs mt-1">
            Professional Services & Solutions
          </p>
        </div>
      </div>
    </div>
  )
}

// Export the fetch function for use in other components
export { fetchInvoiceData }
