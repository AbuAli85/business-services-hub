'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Database, Settings, CheckCircle } from 'lucide-react'

interface ProgressFallbackProps {
  bookingId: string
  userRole: 'provider' | 'client'
}

export function ProgressFallback({ bookingId, userRole }: ProgressFallbackProps) {
  const [schemaStatus, setSchemaStatus] = useState<'checking' | 'missing' | 'available'>('checking')

  useEffect(() => {
    checkSchemaStatus()
  }, [])

  const checkSchemaStatus = async () => {
    try {
      // Try to query the milestones table to see if it exists
      const response = await fetch('/api/check-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'milestones' })
      })
      
      if (response.ok) {
        setSchemaStatus('available')
      } else {
        setSchemaStatus('missing')
      }
    } catch (error) {
      setSchemaStatus('missing')
    }
  }

  if (schemaStatus === 'checking') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (schemaStatus === 'missing') {
    return (
      <div className="space-y-6">
        {/* Setup Required Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-amber-800">
                Advanced Progress Tracking Setup Required
              </h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>
                  The advanced progress tracking system requires database schema setup. 
                  Please follow these steps to enable the full functionality:
                </p>
                <ol className="mt-3 list-decimal list-inside space-y-2">
                  <li>Go to your Supabase Dashboard</li>
                  <li>Navigate to SQL Editor</li>
                  <li>Copy and paste the contents of <code className="bg-amber-100 px-1 rounded">supabase/migrations/094_advanced_progress_tracking.sql</code></li>
                  <li>Execute the SQL script</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Progress View */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Progress Tracking</h3>
          <p className="text-gray-600 mb-4">
            While the advanced system is being set up, you can use the basic progress tracking below.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-blue-800">Total Tasks</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-green-800">Completed</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">0</div>
              <div className="text-sm text-red-800">Overdue</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">0%</div>
              <div className="text-sm text-purple-800">Progress</div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
            <Database className="h-5 w-5 mr-2 text-gray-600" />
            Database Setup Instructions
          </h4>
          <div className="text-sm text-gray-700 space-y-2">
            <p>1. <strong>Access Supabase Dashboard:</strong> Go to your Supabase project dashboard</p>
            <p>2. <strong>Open SQL Editor:</strong> Click on "SQL Editor" in the left sidebar</p>
            <p>3. <strong>Create New Query:</strong> Click "New query" button</p>
            <p>4. <strong>Copy Migration:</strong> Copy the entire contents of the migration file</p>
            <p>5. <strong>Execute Script:</strong> Paste and run the SQL script</p>
            <p>6. <strong>Verify Tables:</strong> Check that these tables were created:</p>
            <ul className="ml-4 mt-2 space-y-1">
              <li>• <code className="bg-gray-200 px-1 rounded">milestones</code></li>
              <li>• <code className="bg-gray-200 px-1 rounded">tasks</code></li>
              <li>• <code className="bg-gray-200 px-1 rounded">time_entries</code></li>
              <li>• <code className="bg-gray-200 px-1 rounded">task_comments</code></li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // If schema is available, show the actual progress tracking
  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="ml-2 text-sm font-medium text-green-800">
            Advanced Progress Tracking is ready!
          </span>
        </div>
      </div>
      <p className="text-gray-600">
        The advanced progress tracking system is now available. Please refresh the page to load the full interface.
      </p>
    </div>
  )
}
