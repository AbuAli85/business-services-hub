'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugRolePage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRole = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        // Get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        // Get profile
        let profile = null
        let profileError = null
        if (user) {
          const result = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          profile = result.data
          profileError = result.error
        }
        
        setDebugInfo({
          session: {
            exists: !!session,
            user_metadata: session?.user?.user_metadata,
            role_from_metadata: session?.user?.user_metadata?.role
          },
          user: {
            exists: !!user,
            id: user?.id,
            email: user?.email,
            metadata_role: user?.user_metadata?.role,
            userError: userError?.message
          },
          profile: {
            exists: !!profile,
            id: profile?.id,
            role: profile?.role,
            full_name: profile?.full_name,
            error: profileError?.message
          },
          errors: {
            sessionError: sessionError?.message,
            userError: userError?.message,
            profileError: profileError?.message
          }
        })
      } catch (error: any) {
        setDebugInfo({
          criticalError: error.message
        })
      } finally {
        setLoading(false)
      }
    }
    
    checkRole()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What to Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">1. Check Profile Role:</h3>
              <p className="text-sm text-gray-600">
                Look for <code className="bg-gray-200 px-2 py-1 rounded">"profile" → "role"</code>
              </p>
              <p className="text-sm font-mono mt-2">
                Current: <span className="font-bold">{debugInfo?.profile?.role || 'NOT SET'}</span>
              </p>
              {debugInfo?.profile?.role !== 'provider' && (
                <p className="text-red-600 font-semibold mt-2">
                  ⚠️ Your role is "{debugInfo?.profile?.role}", not "provider". This is why you're being redirected!
                </p>
              )}
            </div>

            <div>
              <h3 className="font-semibold">2. Check Metadata Role:</h3>
              <p className="text-sm text-gray-600">
                Look for <code className="bg-gray-200 px-2 py-1 rounded">"user" → "metadata_role"</code>
              </p>
              <p className="text-sm font-mono mt-2">
                Current: <span className="font-bold">{debugInfo?.user?.metadata_role || 'NOT SET'}</span>
              </p>
            </div>

            <div>
              <h3 className="font-semibold">3. Expected Values:</h3>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                <li>Profile role should be: <code className="bg-gray-200 px-2 py-1 rounded">provider</code></li>
                <li>Metadata role should be: <code className="bg-gray-200 px-2 py-1 rounded">provider</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2))
            alert('Debug info copied to clipboard!')
          }}
          className="w-full"
        >
          Copy Debug Info
        </Button>
      </div>
    </div>
  )
}

