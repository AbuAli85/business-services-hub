'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import { PlatformLogo } from './platform-logo'

interface UserLogoProps {
  email: string
  className?: string
  showFallback?: boolean
}

export function UserLogo({ email, className = '', showFallback = true }: UserLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserLogo()
  }, [email])

  const fetchUserLogo = async () => {
    if (!email) {
      setLoading(false)
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      // First, get the user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, company_id')
        .eq('email', email)
        .single()

      if (!profile) {
        setLoading(false)
        return
      }

      let logoUrl: string | null = null

      if (profile.role === 'provider' && profile.company_id) {
        // Get company logo for providers
        const { data: company } = await supabase
          .from('companies')
          .select('logo_url')
          .eq('id', profile.company_id)
          .single()

        logoUrl = company?.logo_url || null
      } else {
        // Get profile logo for clients
        const { data: profileData } = await supabase
          .from('profiles')
          .select('logo_url')
          .eq('id', profile.id)
          .single()

        logoUrl = profileData?.logo_url || null
      }

      setLogoUrl(logoUrl)
    } catch (error) {
      console.error('Error fetching user logo:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Company Logo"
        className={`object-contain ${className}`}
        onError={() => setLogoUrl(null)}
      />
    )
  }

  if (showFallback) {
    return <PlatformLogo className={className} />
  }

  return null
}
