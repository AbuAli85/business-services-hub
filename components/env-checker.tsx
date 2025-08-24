'use client'

import { useState, useEffect } from 'react'
import { isEnvironmentConfigured, getEnvironmentStatus } from '@/lib/supabase'

export function EnvChecker() {
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const status = getEnvironmentStatus()
      setEnvStatus(status)
      setIsConfigured(isEnvironmentConfigured())
    } catch (error) {
      console.error('Error checking environment:', error)
      setIsConfigured(false)
    }
  }, [])

  if (isConfigured === null) {
    return <div className="p-4 text-gray-500">Checking environment...</div>
  }

  if (isConfigured) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span className="text-green-800 font-medium">Environment configured correctly</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="mb-3">
        <div className="flex items-center mb-2">
          <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
          <span className="text-red-800 font-medium">Environment not configured</span>
        </div>
        <p className="text-red-700 text-sm">
          Supabase environment variables are missing. Please check your .env.local file.
        </p>
      </div>
      
      {envStatus && (
        <div className="text-sm text-red-600">
          <details className="cursor-pointer">
            <summary className="font-medium">Environment Details</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
              {JSON.stringify(envStatus, null, 2)}
            </pre>
          </details>
        </div>
      )}
      
      <div className="mt-3 text-sm text-red-700">
        <p className="font-medium">To fix this:</p>
        <ol className="list-decimal list-inside mt-1 space-y-1">
          <li>Copy <code className="bg-red-100 px-1 rounded">env.example</code> to <code className="bg-red-100 px-1 rounded">.env.local</code></li>
          <li>Update the values in <code className="bg-red-100 px-1 rounded">.env.local</code></li>
          <li>Restart your development server</li>
        </ol>
      </div>
    </div>
  )
}
