'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSupabaseClient, getEnvironmentStatus } from '@/lib/supabase'

export default function TestPage() {
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const status = getEnvironmentStatus()
      setEnvStatus(status)
    } catch (error) {
      console.error('Environment check failed:', error)
      setEnvStatus({ error: error.message })
    }
  }, [])

  const testSupabaseConnection = async () => {
    setLoading(true)
    setTestResult('')
    
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        setTestResult(`❌ Connection failed: ${error.message}`)
      } else {
        setTestResult(`✅ Connection successful! Session: ${data.session ? 'Active' : 'None'}`)
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testSignupEndpoint = async () => {
    setLoading(true)
    setTestResult('')
    
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123',
        options: {
          data: {
            role: 'client',
            full_name: 'Test User',
            phone: '+1234567890'
          }
        }
      })
      
      if (error) {
        setTestResult(`❌ Signup test failed: ${error.message}`)
      } else {
        setTestResult(`✅ Signup endpoint working! User ID: ${data.user?.id || 'None'}`)
      }
    } catch (error) {
      setTestResult(`❌ Signup error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Environment & Supabase Test</h1>
        <p className="text-gray-600">Test your configuration and connection</p>
      </div>

      {/* Environment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Status</CardTitle>
          <CardDescription>Current environment configuration</CardDescription>
        </CardHeader>
        <CardContent>
          {envStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Environment:</strong>
                  <Badge variant="outline" className="ml-2">
                    {envStatus.nodeEnv || 'unknown'}
                  </Badge>
                </div>
                <div>
                  <strong>Client Side:</strong>
                  <Badge variant={envStatus.isClient ? "default" : "secondary"} className="ml-2">
                    {envStatus.isClient ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <strong>Environment Variables:</strong>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span>SUPABASE_URL:</span>
                    <Badge variant={envStatus.envCheck?.supabaseUrl ? "default" : "destructive"}>
                      {envStatus.envCheck?.supabaseUrl ? "✅ Set" : "❌ Missing"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>SUPABASE_ANON_KEY:</span>
                    <Badge variant={envStatus.envCheck?.supabaseAnonKey ? "default" : "destructive"}>
                      {envStatus.envCheck?.supabaseAnonKey ? "✅ Set" : "❌ Missing"}
                    </Badge>
                  </div>
                </div>
              </div>

              {envStatus.envCheck?.supabaseUrl && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <strong className="text-blue-800">Supabase URL:</strong>
                  <div className="text-blue-700 text-sm mt-1 break-all">
                    {envStatus.envCheck.supabaseUrl}
                  </div>
                </div>
              )}

              {envStatus.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <strong className="text-red-800">Error:</strong>
                  <div className="text-red-700 text-sm mt-1">{envStatus.error}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-pulse">Loading environment status...</div>
          )}
        </CardContent>
      </Card>

      {/* Connection Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Tests</CardTitle>
          <CardDescription>Test Supabase connectivity and endpoints</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={testSupabaseConnection} 
              disabled={loading}
              variant="outline"
            >
              Test Connection
            </Button>
            <Button 
              onClick={testSignupEndpoint} 
              disabled={loading}
              variant="outline"
            >
              Test Signup Endpoint
            </Button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-md ${
              testResult.startsWith('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <strong>Test Result:</strong>
              <div className="mt-1">{testResult}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <strong className="text-yellow-800">If you see 500 errors:</strong>
              <ul className="list-disc list-inside text-yellow-700 mt-1 text-sm">
                <li>Check that your .env.local file exists and contains the correct values</li>
                <li>Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set</li>
                <li>Restart your development server after making changes</li>
                <li>Verify your Supabase project is active and accessible</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <strong className="text-blue-800">For production deployment:</strong>
              <ul className="list-disc list-inside text-blue-700 mt-1 text-sm">
                <li>Set environment variables in your hosting platform (Vercel, Netlify, etc.)</li>
                <li>Ensure the variables are prefixed with NEXT_PUBLIC_ for client-side access</li>
                <li>Check that your Supabase project allows connections from your domain</li>
                <li>Verify RLS policies are correctly configured</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
