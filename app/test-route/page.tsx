'use client'

import { useParams } from 'next/navigation'

export default function TestRoutePage() {
  const params = useParams()
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Route Test Page</h1>
        <p className="text-gray-600 mb-4">This page is working correctly!</p>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Route Parameters:</h2>
          <pre className="text-sm text-gray-600">
            {JSON.stringify(params, null, 2)}
          </pre>
        </div>
        <div className="mt-4">
          <a 
            href="/dashboard/client/invoices/template/b0482c14-ede3-4ab0-b939-75f5544dd8d8"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Invoice Template
          </a>
        </div>
      </div>
    </div>
  )
}
