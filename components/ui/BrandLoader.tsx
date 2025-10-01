'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'

interface BrandLoaderProps {
  size?: number
  className?: string
}

export function BrandLoader({ size = 56, className = '' }: BrandLoaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [initials, setInitials] = useState<string>('SP')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted) return
        if (!user) return

        const name = (user.user_metadata?.full_name as string) || ''
        if (name) setInitials(name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase())

        // Try common logo fields
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, logo_url, company_logo_url')
          .eq('id', user.id)
          .maybeSingle()

        const found = (data as any)?.avatar_url || (data as any)?.logo_url || (data as any)?.company_logo_url || null
        if (found) setLogoUrl(found)
      } catch {}
    })()
    return () => { mounted = false }
  }, [])

  const dim = `${size}px`

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} aria-busy="true" aria-live="polite">
      <div className="relative" style={{ width: dim, height: dim }}>
        <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Brand" className="rounded-full object-cover w-full h-full shadow-sm" />
        ) : (
          <div className="rounded-full w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-semibold shadow-sm">
            {initials}
          </div>
        )}
        <div className="absolute -inset-1 rounded-full border-2 border-blue-200 animate-spin" style={{ borderTopColor: 'transparent' }} />
      </div>
      <div className="mt-3 text-sm text-gray-600">Loading…</div>
    </div>
  )
}

export default BrandLoader


