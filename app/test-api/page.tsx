'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getApiUrl, testApiConfiguration, validateApiConfig } from '@/lib/api-config'

export default function TestApiPage() {
  const [configStatus, setConfigStatus] = useState<{
    currentHost?: string | null
    portalUrl?: string
    marketingUrl?: string
    isMarketingSite?: boolean
    isPortalSite?: boolean
    isDevelopment?: boolean
    envValidation?: string
  } | null>(null)
  const [testResults, setTestResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testConfiguration = () => {
    const config = testApiConfiguration()
    setConfigStatus(config)
    console.log('🔧 API Configuration Test:', config)
  }

  const testApiCall = async () => {
    setLoading(true)
    try {
      console.log('🧪 Testing API call to /api/bookings...')
      
      // Test the API configuration
      const apiUrl = getApiUrl('/api/bookings')
      console.log('🔗 Generated API URL:', apiUrl)
      
      // Make a test call (this will likely fail with 401/403, but we can see the URL)
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      const result = {
        apiUrl,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        success: response.ok,
        timestamp: new Date().toISOString()
      }
      
      setTestResults(result)
      console.log('✅ API Test Results:', result)
      
    } catch (error) {
      const errorResult = {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
      setTestResults(errorResult)
      console.error('❌ API Test Error:', errorResult)
    } finally {
      setLoading(false)
    }
  }

  const validateEnvironment = () => {
    const errors = validateApiConfig()
    if (errors.length === 0) {
      setConfigStatus(prev => ({ ...prev, envValidation: '✅ All environment variables are set correctly' }))
    } else {
      setConfigStatus(prev => ({ ...prev, envValidation: `❌ Environment validation errors: ${errors.join(', ')}` }))
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">🔧 API Configuration Test</h1>
        <p className="text-gray-600 mt-2">Test and verify cross-domain API configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Test */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Test</CardTitle>
            <CardDescription>Test the current API configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testConfiguration} className="w-full">
              Test API Configuration
            </Button>
            
            <Button onClick={validateEnvironment} variant="outline" className="w-full">
              Validate Environment Variables
            </Button>

            {configStatus && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Configuration Status:</h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Current Host:</strong> {configStatus.currentHost || 'Unknown'}</div>
                  <div><strong>Portal URL:</strong> {configStatus.portalUrl}</div>
                  <div><strong>Marketing URL:</strong> {configStatus.marketingUrl}</div>
                  <div><strong>Is Marketing Site:</strong> 
                    <Badge variant={configStatus.isMarketingSite ? 'default' : 'secondary'} className="ml-2">
                      {configStatus.isMarketingSite ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div><strong>Is Portal Site:</strong> 
                    <Badge variant={configStatus.isPortalSite ? 'default' : 'secondary'} className="ml-2">
                      {configStatus.isPortalSite ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div><strong>Is Development:</strong> 
                    <Badge variant={configStatus.isDevelopment ? 'default' : 'secondary'} className="ml-2">
                      {configStatus.isDevelopment ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {configStatus.envValidation && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-blue-800">
                      {configStatus.envValidation}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Test */}
        <Card>
          <CardHeader>
            <CardTitle>API Call Test</CardTitle>
            <CardDescription>Test actual API endpoint calls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testApiCall} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Booking API Call'}
            </Button>

            {testResults && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Test Results:</h4>
                <div className="space-y-2 text-sm">
                  {testResults.error ? (
                    <div className="text-red-600">
                      <strong>Error:</strong> {testResults.error}
                    </div>
                  ) : (
                    <>
                      <div><strong>API URL:</strong> {testResults.apiUrl}</div>
                      <div><strong>Status:</strong> {testResults.status} {testResults.statusText}</div>
                      <div><strong>Success:</strong> 
                        <Badge variant={testResults.success ? 'default' : 'destructive'} className="ml-2">
                          {testResults.success ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div><strong>Timestamp:</strong> {testResults.timestamp}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
          <CardDescription>Understanding the cross-domain API configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Marketing Site (marketing.thedigitalmorph.com)</h4>
              <p className="text-sm text-gray-600">
                API calls are automatically routed to the portal site (portal.thesmartpro.io)
              </p>
              <code className="text-xs bg-gray-100 p-1 rounded">
                /api/bookings → https://portal.thesmartpro.io/api/bookings
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold">Portal Site (portal.thesmartpro.io)</h4>
              <p className="text-sm text-gray-600">
                API calls use relative URLs (same domain)
              </p>
              <code className="text-xs bg-gray-100 p-1 rounded">
                /api/bookings → /api/bookings
              </code>
            </div>
            
            <div>
              <h4 className="font-semibold">Development (localhost)</h4>
              <p className="text-sm text-gray-600">
                API calls use relative URLs (same domain)
              </p>
              <code className="text-xs bg-gray-100 p-1 rounded">
                /api/bookings → /api/bookings
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>🚨 Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <h5 className="font-semibold text-red-600">404 Errors</h5>
              <p className="text-sm text-gray-600">
                Ensure the API endpoint exists on the portal site and environment variables are set correctly.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold text-red-600">CORS Errors</h5>
              <p className="text-sm text-gray-600">
                Verify that the portal site allows requests from the marketing site domain.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold text-red-600">Environment Variables</h5>
              <p className="text-sm text-gray-600">
                Check that NEXT_PUBLIC_PORTAL_API_URL and NEXT_PUBLIC_MARKETING_URL are set correctly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
