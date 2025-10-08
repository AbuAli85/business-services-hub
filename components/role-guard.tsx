'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'

type Role = 'admin' | 'manager' | 'provider' | 'client'

// Cache role in memory for faster subsequent checks
let cachedRole: Role | null = null
let cachedUserId: string | null = null

export function RoleGuard({ allow, children, redirect = '/dashboard' }:{ allow: Role[]; children: React.ReactNode; redirect?: string }) {
  const router = useRouter()
  // Initialize with cached role check if available
  const initialOk = cachedRole && allow.includes(cachedRole) ? true : null
  const [ok, setOk] = useState<boolean | null>(initialOk)
  const [timedOut, setTimedOut] = useState(false)

  console.log('🛡️ RoleGuard checking access', { allow, cachedRole, initialOk })

  useEffect(() => {
    let mounted = true
    const timeoutId = setTimeout(() => {
      if (mounted && ok === null) {
        console.log('⏰ RoleGuard timeout - redirecting to', redirect)
        setTimedOut(true)
        setOk(false)
        router.replace(redirect)
      }
    }, 8000)
    ;(async () => {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session?.user?.id) {
        setOk(false)
        router.replace('/auth/sign-in')
        return
      }
      
      // Check cache first for instant verification
      if (cachedUserId === session.user.id && cachedRole && allow.includes(cachedRole)) {
        console.log('✅ RoleGuard: Using cached role', { cachedRole, allow })
        setOk(true)
        return
      }
      
      // Fast path: trust metadata role if available
      const metaRole = (session.user.user_metadata as any)?.role as Role | undefined
      console.log('🔍 RoleGuard: Checking metadata role', { metaRole, allow })
      if (metaRole && allow.includes(metaRole)) {
        console.log('✅ RoleGuard: Metadata role allowed', { metaRole })
        cachedRole = metaRole
        cachedUserId = session.user.id
        setOk(true)
        return
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      const role = (prof?.role || null) as Role | null
      console.log('🔍 RoleGuard: Checked profile role', { role, allow })
      if (role && allow.includes(role)) {
        console.log('✅ RoleGuard: Profile role allowed', { role })
        cachedRole = role
        cachedUserId = session.user.id
        setOk(true)
      }
      else { 
        console.log('❌ RoleGuard: Access denied, redirecting to', redirect, { role, allow })
        setOk(false)
        router.replace(redirect)
      }
    })()
    return () => { mounted = false; clearTimeout(timeoutId) }
  }, [allow, router, redirect])

  if (ok === null) {
    // Show minimal loading - let the page render while we check in the background
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }
  if (!ok) return null
  return <>{children}</>
}


