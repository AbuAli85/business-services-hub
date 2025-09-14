'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function DebugInvoicePage() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthAndDatabase()
  }, [])

  const checkAuthAndDatabase = async () => {
    try {
      setLoading(true)
      const supabase = await getSupabaseClient()
      
      // Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      // Check if we can access invoices table
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, status')
        .limit(5)

      // Check specific invoice ID
      const testInvoiceId = 'b0482c14-ede3-4ab0-b939-75f5544dd8d8'
      const { data: specificInvoice, error: specificError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', testInvoiceId)
        .single()

      setDebugInfo({
        user: user ? { id: user.id, email: user.email } : null,
        userError: userError?.message,
        invoicesCount: invoices?.length || 0,
        invoicesError: invoicesError?.message,
        specificInvoice: specificInvoice ? { id: specificInvoice.id, status: specificInvoice.status } : null,
        specificError: specificError?.message,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication and database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Invoice Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify({
              user: debugInfo.user,
              userError: debugInfo.userError
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Database Connection</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify({
              invoicesCount: debugInfo.invoicesCount,
              invoicesError: debugInfo.invoicesError
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Specific Invoice Test</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify({
              specificInvoice: debugInfo.specificInvoice,
              specificError: debugInfo.specificError
            }, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Full Debug Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()}>
            Refresh Debug Info
          </Button>
          <Button onClick={() => router.push('/dashboard/client/invoices')}>
            Go to Invoices
          </Button>
          <Button onClick={() => router.push('/dashboard/client/invoices/template/b0482c14-ede3-4ab0-b939-75f5544dd8d8')}>
            Test Invoice Template
          </Button>
        </div>
      </div>
    </div>
  )
}
