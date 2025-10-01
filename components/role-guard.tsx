'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'
import { BrandLoader } from '@/components/ui/BrandLoader'

type Role = 'admin' | 'manager' | 'provider' | 'client'

export function RoleGuard({ allow, children, redirect = '/dashboard' }:{ allow: Role[]; children: React.ReactNode; redirect?: string }) {
  const router = useRouter()
  const [ok, setOk] = useState<boolean | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let mounted = true
    const timeoutId = setTimeout(() => { if (mounted && ok === null) setTimedOut(true) }, 8000)
    ;(async () => {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session?.user?.id) {
        setOk(false)
        router.replace('/auth/sign-in')
        return
      }
      // Fast path: trust metadata role if available
      const metaRole = (session.user.user_metadata as any)?.role as Role | undefined
      if (metaRole && allow.includes(metaRole)) {
        setOk(true)
        return
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      const role = (prof?.role || null) as Role | null
      if (role && allow.includes(role)) setOk(true)
      else { setOk(false); router.replace(redirect) }
    })()
    return () => { mounted = false; clearTimeout(timeoutId) }
  }, [allow, router, redirect, ok])

  if (ok === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <BrandLoader size={48} />
      </div>
    )
  }
  if (!ok) return null
  return <>{children}</>
}


