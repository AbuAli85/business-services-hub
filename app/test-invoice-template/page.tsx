'use client'

import React, { useState, useEffect } from 'react'
import InvoiceTemplate from '@/components/invoice/InvoiceTemplate'
import type { Invoice } from '@/types/invoice'
import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'

// Sample data for demonstration
const sampleInvoice: Invoice = {
  id: '1',
  invoice_number: '123456',
  issued_date: '2023-11-09',
  due_date: '2023-11-24',
  subtotal: 700,
  tax_rate: 0.10,
  tax_amount: 70,
  total: 770,
  status: 'sent',
  currency: 'USD',
  notes: 'Thank you for your business! Payment is due within 30 days of invoice date.',
  company_id: '1',
  client_id: '1',
  created_at: '2023-11-09T00:00:00Z',
  updated_at: '2023-11-09T00:00:00Z',
  company: {
    id: '1',
    name: 'Add your Company Name',
    address: '123 Anywhere St., Any City, ST 12345',
    phone: '123-456-7890',
    email: 'hello@reallygreatsite.com',
    website: 'reallygreatsite.com',
    logo_url: undefined,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  client: {
    id: '1',
    full_name: 'Add a Company Name',
    email: 'hello@reallygreatsite.com',
    phone: '123-456-7890',
    company: {
      id: '2',
      name: 'Client Company',
      address: '123 Anywhere St., Any City, ST 12345',
      phone: '123-456-7890',
      email: 'client@company.com',
      website: 'clientcompany.com',
      logo_url: undefined,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    },
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  items: [
    {
      id: '1',
      invoice_id: '1',
      product: 'Add a service',
      description: 'Professional service description',
      qty: 1,
      unit_price: 100,
      total: 100,
      created_at: '2023-11-09T00:00:00Z',
      updated_at: '2023-11-09T00:00:00Z'
    },
    {
      id: '2',
      invoice_id: '1',
      product: 'Add a service',
      description: 'Professional service description',
      qty: 1,
      unit_price: 100,
      total: 100,
      created_at: '2023-11-09T00:00:00Z',
      updated_at: '2023-11-09T00:00:00Z'
    },
    {
      id: '3',
      invoice_id: '1',
      product: 'Add a service',
      description: 'Professional service description',
      qty: 1,
      unit_price: 100,
      total: 100,
      created_at: '2023-11-09T00:00:00Z',
      updated_at: '2023-11-09T00:00:00Z'
    },
    {
      id: '4',
      invoice_id: '1',
      product: 'Add a service',
      description: 'Professional service description',
      qty: 1,
      unit_price: 100,
      total: 100,
      created_at: '2023-11-09T00:00:00Z',
      updated_at: '2023-11-09T00:00:00Z'
    },
    {
      id: '5',
      invoice_id: '1',
      product: 'Add a service',
      description: 'Professional service description',
      qty: 1,
      unit_price: 100,
      total: 100,
      created_at: '2023-11-09T00:00:00Z',
      updated_at: '2023-11-09T00:00:00Z'
    },
    {
      id: '6',
      invoice_id: '1',
      product: 'Add a service',
      description: 'Professional service description',
      qty: 1,
      unit_price: 100,
      total: 100,
      created_at: '2023-11-09T00:00:00Z',
      updated_at: '2023-11-09T00:00:00Z'
    },
    {
      id: '7',
      invoice_id: '1',
      product: 'Add a service',
      description: 'Professional service description',
      qty: 1,
      unit_price: 100,
      total: 100,
      created_at: '2023-11-09T00:00:00Z',
      updated_at: '2023-11-09T00:00:00Z'
    }
  ]
}

export default function TestInvoiceTemplatePage() {
  const [isPrinting, setIsPrinting] = useState(false)

  const handlePrint = () => {
    setIsPrinting(true)
    window.print()
    setTimeout(() => setIsPrinting(false), 1000)
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/invoices/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId: sampleInvoice.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${sampleInvoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      if (a.parentNode) {
        a.parentNode.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action Buttons - Hidden in print */}
      {!isPrinting && (
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Invoice Template Preview</h1>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Invoice
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
            </div>
          </div>
        </div>
      )}

      {/* Invoice Template */}
      <div className="py-8">
        <InvoiceTemplate 
          invoice={sampleInvoice}
          className={isPrinting ? 'print:shadow-none' : ''}
        />
      </div>

      {/* Instructions - Hidden in print */}
      {!isPrinting && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Template Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Design Elements</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Clean, modern layout with blue sidebar</li>
                  <li>• Professional typography and spacing</li>
                  <li>• Responsive design for all screen sizes</li>
                  <li>• Print-friendly styling</li>
                  <li>• Company logo support</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Functionality</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Dynamic data from Supabase</li>
                  <li>• Currency formatting</li>
                  <li>• Date formatting</li>
                  <li>• PDF generation support</li>
                  <li>• Print optimization</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
