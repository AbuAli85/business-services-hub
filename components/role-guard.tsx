'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

type Role = 'admin' | 'manager' | 'provider' | 'client'

export function RoleGuard({ allow, children, redirect = '/dashboard' }:{ allow: Role[]; children: React.ReactNode; redirect?: string }) {
  const router = useRouter()
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const supabase = await getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session?.user?.id) {
        setOk(false)
        router.replace('/auth/sign-in')
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
    return () => { mounted = false }
  }, [allow, router, redirect])

  if (ok === null) return null
  if (!ok) return null
  return <>{children}</>
}


