'use client'

import React from 'react'
import Invoice from '@/components/invoice/Invoice'

export default function TestInvoicePage() {
  // Use a sample invoice ID for testing
  const sampleInvoiceId = 'a311d538-6909-4a94-bd04-eca2f7d5efce'

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Invoice Component Test</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <Invoice 
            invoiceId={sampleInvoiceId}
            showPrintButton={true}
            onPrint={() => {
              console.log('Print button clicked')
              window.print()
            }}
          />
        </div>
      </div>
    </div>
  )
}
