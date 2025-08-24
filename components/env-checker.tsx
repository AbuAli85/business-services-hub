'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getEnvironmentStatus, isEnvironmentConfigured } from '@/lib/supabase'

export default function EnvChecker() {
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [isConfigured, setIsConfigured] = useState<boolean>(false)

  useEffect(() => {
    const checkEnv = () => {
      try {
        const status = getEnvironmentStatus()
        const configured = isEnvironmentConfigured()
        setEnvStatus(status)
        setIsConfigured(configured)
      } catch (error) {
        console.error('Environment check failed:', error)
        setEnvStatus({ error: error.message })
        setIsConfigured(false)
      }
    }

    checkEnv()
  }, [])

  const refreshCheck = () => {
    window.location.reload()
  }

  if (!envStatus) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Environment Checker</CardTitle>
          <CardDescription>Checking environment configuration...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Environment Checker
          <Badge variant={isConfigured ? "default" : "destructive"}>
            {isConfigured ? "Configured" : "Not Configured"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Check if your environment variables are properly configured
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {envStatus.error ? (
          <div className="text-red-600">
            <strong>Error:</strong> {envStatus.error}
          </div>
        ) : (
          <>
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
                  <Badge variant={envStatus.envCheck.supabaseUrl ? "default" : "destructive"}>
                    {envStatus.envCheck.supabaseUrl ? "✅ Set" : "❌ Missing"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>SUPABASE_ANON_KEY:</span>
                  <Badge variant={envStatus.envCheck.supabaseAnonKey ? "default" : "destructive"}>
                    {envStatus.envCheck.supabaseAnonKey ? "✅ Set" : "❌ Missing"}
                  </Badge>
                </div>
              </div>
            </div>

            {envStatus.envCheck.missingVars.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <strong className="text-yellow-800">Missing Variables:</strong>
                <ul className="list-disc list-inside text-yellow-700 mt-1">
                  {envStatus.envCheck.missingVars.map((varName: string) => (
                    <li key={varName}>{varName}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <strong>Client Status:</strong>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span>Supabase Client:</span>
                  <Badge variant={envStatus.hasClient ? "default" : "secondary"}>
                    {envStatus.hasClient ? "✅ Created" : "❌ Not Created"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span>Admin Client:</span>
                  <Badge variant={envStatus.hasAdminClient ? "default" : "secondary"}>
                    {envStatus.hasAdminClient ? "✅ Created" : "❌ Not Created"}
                  </Badge>
                </div>
              </div>
            </div>

            {envStatus.envCheck.supabaseUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <strong className="text-blue-800">Supabase URL:</strong>
                <div className="text-blue-700 text-sm mt-1 break-all">
                  {envStatus.envCheck.supabaseUrl}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button onClick={refreshCheck} variant="outline">
            Refresh Check
          </Button>
          <Button 
            onClick={() => window.open('https://supabase.com/docs/guides/getting-started/environment-variables', '_blank')}
            variant="outline"
          >
            View Docs
          </Button>
        </div>

        {!isConfigured && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <strong className="text-red-800">Configuration Issues Detected:</strong>
            <ul className="list-disc list-inside text-red-700 mt-1">
              <li>Check that your .env.local file exists and contains the required variables</li>
              <li>Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set</li>
              <li>Restart your development server after making changes</li>
              <li>For production, ensure environment variables are set in your hosting platform</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
