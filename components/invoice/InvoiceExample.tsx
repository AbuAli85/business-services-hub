'use client'

import React from 'react'
import Invoice from './Invoice'

// Example usage of the Invoice component
export default function InvoiceExample() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Invoice Preview
        </h1>
        
        {/* Replace 'your-invoice-id' with an actual invoice ID from your database */}
        <Invoice 
          invoiceId="your-invoice-id"
          className="mb-8"
          showPrintButton={true}
          onPrint={() => {
            console.log('Print button clicked')
            // Custom print logic can be added here
          }}
        />
        
        {/* Instructions */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Usage Instructions</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. Replace 'your-invoice-id' with an actual invoice ID from your database</p>
            <p>2. The component will automatically fetch invoice data from Supabase</p>
            <p>3. Use the Print button to print the invoice</p>
            <p>4. Use the Download PDF button to generate a PDF version</p>
            <p>5. The component is fully responsive and print-friendly</p>
          </div>
        </div>
      </div>
    </div>
  )
}
