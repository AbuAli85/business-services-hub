'use client'

import React from 'react'
import InvoiceTemplate from './InvoiceTemplate'
import type { Invoice } from '@/types/invoice'

// Example usage of the InvoiceTemplate component
export default function InvoiceTemplateExample() {
  // Sample invoice data - replace with actual data from your database
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
    notes: 'Thank you for your business!',
    company_id: '1',
    client_id: '1',
    created_at: '2023-11-09T00:00:00Z',
    updated_at: '2023-11-09T00:00:00Z',
    company: {
      id: '1',
      name: 'Your Company Name',
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
      full_name: 'Client Company Name',
      email: 'client@company.com',
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
        product: 'Web Development Service',
        description: 'Custom website development and design',
        qty: 1,
        unit_price: 100,
        total: 100,
        created_at: '2023-11-09T00:00:00Z',
        updated_at: '2023-11-09T00:00:00Z'
      },
      {
        id: '2',
        product: 'SEO Optimization',
        description: 'Search engine optimization services',
        qty: 1,
        unit_price: 100,
        total: 100,
        created_at: '2023-11-09T00:00:00Z',
        updated_at: '2023-11-09T00:00:00Z'
      },
      {
        id: '3',
        product: 'Content Management',
        description: 'Content creation and management',
        qty: 1,
        unit_price: 100,
        total: 100,
        created_at: '2023-11-09T00:00:00Z',
        updated_at: '2023-11-09T00:00:00Z'
      },
      {
        id: '4',
        product: 'Digital Marketing',
        description: 'Social media and digital marketing',
        qty: 1,
        unit_price: 100,
        total: 100,
        created_at: '2023-11-09T00:00:00Z',
        updated_at: '2023-11-09T00:00:00Z'
      },
      {
        id: '5',
        product: 'Analytics Setup',
        description: 'Google Analytics and tracking setup',
        qty: 1,
        unit_price: 100,
        total: 100,
        created_at: '2023-11-09T00:00:00Z',
        updated_at: '2023-11-09T00:00:00Z'
      },
      {
        id: '6',
        product: 'Maintenance & Support',
        description: 'Ongoing website maintenance',
        qty: 1,
        unit_price: 100,
        total: 100,
        created_at: '2023-11-09T00:00:00Z',
        updated_at: '2023-11-09T00:00:00Z'
      },
      {
        id: '7',
        product: 'Consultation Services',
        description: 'Business strategy consultation',
        qty: 1,
        unit_price: 100,
        total: 100,
        created_at: '2023-11-09T00:00:00Z',
        updated_at: '2023-11-09T00:00:00Z'
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Professional Invoice Template
        </h1>
        
        <InvoiceTemplate 
          invoice={sampleInvoice}
          className="mb-8"
        />
        
        {/* Usage Instructions */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Usage Instructions</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. Replace the sample data with actual invoice data from your database</p>
            <p>2. The template automatically formats currency and dates</p>
            <p>3. Add your company logo by providing a logo_url in the company data</p>
            <p>4. The template is fully responsive and print-friendly</p>
            <p>5. Customize colors and styling by modifying the Tailwind classes</p>
          </div>
        </div>
      </div>
    </div>
  )
}
