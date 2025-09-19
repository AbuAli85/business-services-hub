'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

export default function TestAdminApiPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testApi = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('🔐 Session:', { 
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        role: session?.user?.user_metadata?.role
      })

      if (!session) {
        throw new Error('No session found')
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

      console.log('📡 Making API request...')
      const res = await fetch('/api/admin/users', { cache: 'no-store', headers })
      
      console.log('📡 Response:', { 
        status: res.status, 
        statusText: res.statusText,
        ok: res.ok 
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`API Error: ${res.status} - ${errorText}`)
      }

      const json = await res.json()
      console.log('✅ API Success:', json)
      setResult(json)
    } catch (err) {
      console.error('❌ Test failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Admin API</h1>
      
      <button 
        onClick={testApi}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <strong>Success!</strong>
          <pre className="mt-2 text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
