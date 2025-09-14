'use client'

import React from 'react'
import type { Invoice } from '@/types/invoice'
import { formatCurrency, formatDate } from '@/lib/invoice-service'

interface InvoiceTemplateProps {
  invoice: Invoice
  className?: string
}

export default function InvoiceTemplate({ invoice, className = '' }: InvoiceTemplateProps) {
  console.log('🔍 InvoiceTemplate received data:', {
    company: invoice.company,
    client: invoice.client,
    fullInvoice: invoice
  })
  
  return (
    <div className={`max-w-4xl mx-auto bg-white shadow-lg print:shadow-none ${className}`}>
      {/* Main Container with Blue Sidebar */}
      <div className="flex h-full min-h-screen" style={{ height: '297mm', minHeight: '297mm' }}>
        {/* Blue Sidebar */}
        <div className="w-32 bg-blue-900 flex flex-col items-center py-8 invoice-sidebar" style={{ height: '100%', minHeight: '100%' }}>
          {/* Company Logo Area */}
          <div className="mb-8">
            {invoice.company.logo_url && !invoice.company.logo_url.includes('/logo.png') ? (
              <img
                src={invoice.company.logo_url}
                alt="Company Logo"
                className="w-16 h-16 object-contain bg-white rounded-lg p-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-900 font-bold text-sm">LOGO</span>
              </div>
            )}
          </div>
          
          {/* Sidebar Content */}
          <div className="text-white text-center space-y-6">
            <div className="text-xs font-semibold uppercase tracking-wide">
              Professional Services
            </div>
            <div className="w-8 h-px bg-blue-300 mx-auto"></div>
            <div className="text-xs">
              Quality & Excellence
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-8 print:p-4">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-8 print:mb-6">
            {/* Company Information */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {invoice.company.name}
              </h1>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  <span>{invoice.company.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                  </svg>
                  <span>{invoice.company.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                  <span>{invoice.company.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd"/>
                  </svg>
                  <span>{invoice.company.website || 'reallygreatsite.com'}</span>
                </div>
              </div>
            </div>

            {/* Invoice Title and Number */}
            <div className="text-right">
              <h2 className="text-4xl font-bold text-blue-600 mb-2">Invoice</h2>
              <p className="text-lg text-gray-700 font-semibold">
                Invoice Number: #{invoice.invoice_number}
              </p>
            </div>
          </div>

          {/* Dates and Bill To Section */}
          <div className="flex justify-between mb-8">
            {/* Dates */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Date:</span> {formatDate(invoice.issued_date)}
              </div>
              {invoice.due_date && (
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">Due Date:</span> {formatDate(invoice.due_date)}
                </div>
              )}
            </div>

            {/* Bill To */}
            <div className="text-right">
              <h3 className="text-lg font-bold text-blue-600 mb-2">Bill To:</h3>
              <div className="text-sm text-gray-700">
                <div className="font-semibold">{String(invoice.client.full_name || 'Client Name')}</div>
                <div className="font-semibold">{String(invoice.client.company?.name || 'Client Company')}</div>
                <div className="mt-1">
                  {(() => {
                    const address = invoice.client.company?.address
                    if (typeof address === 'string') {
                      return address
                    } else if (address && typeof address === 'object') {
                      // Handle object address
                      const addrObj = address as any
                      if (addrObj.street) {
                        let addr = addrObj.street
                        if (addrObj.city) addr += `, ${addrObj.city}`
                        if (addrObj.country) addr += `, ${addrObj.country}`
                        return addr
                      } else if (addrObj.address) {
                        return addrObj.address
                      } else {
                        return Object.values(addrObj).filter(v => v && typeof v === 'string').join(', ') || 'Address not provided'
                      }
                    }
                    return 'Address not provided'
                  })()}
                </div>
                <div className="mt-1">{String(invoice.client.company?.email ?? invoice.client.email ?? 'Email not provided')}</div>
                <div className="mt-1">📞 {String(invoice.client.company?.phone ?? invoice.client.phone ?? 'Phone not provided')}</div>
                <div className="mt-1">🌐 {String(invoice.client.company?.website ?? 'Website not provided')}</div>
              </div>
            </div>
          </div>

          {/* Services Table */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-blue-600">Item</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-blue-600">Description</th>
                  <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-blue-600">Qty/Hour</th>
                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-blue-600">Rate</th>
                  <th className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-blue-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-gray-50 print:hover:bg-transparent">
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-700">
                      {String(item.product || '')}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm text-gray-700">
                      {String(item.qty || 1)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-sm text-gray-700 font-semibold">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-semibold text-gray-700">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(invoice.subtotal, invoice.currency)}
                  </span>
                </div>
                {invoice.tax_rate > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Tax ({(invoice.tax_rate * 100).toFixed(1)}%)
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(invoice.tax_amount, invoice.currency)}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Amount Due</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="flex justify-between items-start">
            {/* Signature Area */}
            <div className="flex-1">
              <div className="border-2 border-dashed border-gray-300 p-4 w-64 h-20 rounded">
                <div className="text-sm text-gray-500 text-center">Name and Signature</div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="w-80">
              <h4 className="text-sm font-bold text-blue-600 mb-2">Terms & Conditions</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                <strong>Payment Terms:</strong> Payment is due within 30 days of invoice date. Late payments are subject to a 1.5% monthly service charge. All amounts are in USD unless otherwise specified.<br/><br/>
                <strong>Service Agreement:</strong> All services are provided subject to our standard terms of service. Work performed is guaranteed for 90 days from completion date.<br/><br/>
                <strong>Disputes:</strong> Any disputes must be submitted in writing within 15 days of invoice date. For questions regarding this invoice, please contact us at the provided contact information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
