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
    // Only attempt lookup when email appears valid to avoid noisy 406s
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setLoading(false)
      return
    }

    try {
      const supabase = await getSupabaseClient()
      
      // Since profiles table doesn't have email column, we need to:
      // 1. Get the user ID from auth.users by email
      // 2. Then get the profile by user ID
      
      // First, get the user from auth.users
      const { data: authUser, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser.user) {
        console.log(`No authenticated user found for email: ${email}`)
        setLoading(false)
        return
      }

      // Check if the current user's email matches the requested email
      // Normalize emails for comparison (lowercase and trim)
      const normalizedRequestedEmail = email.toLowerCase().trim()
      const normalizedCurrentEmail = authUser.user.email?.toLowerCase().trim()
      
      // Only warn if emails are significantly different (not just minor formatting)
      // Allow for partial matches or incomplete email rendering
      if (normalizedCurrentEmail && normalizedRequestedEmail && 
          !normalizedCurrentEmail.startsWith(normalizedRequestedEmail) && 
          !normalizedRequestedEmail.startsWith(normalizedCurrentEmail) &&
          normalizedCurrentEmail !== normalizedRequestedEmail) {
        console.log(`Email mismatch: requested ${normalizedRequestedEmail}, current user ${normalizedCurrentEmail}`)
        setLoading(false)
        return
      }

      // Now get the profile using the user ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, company_id, logo_url')
        .eq('id', authUser.user.id)
        .single()

      if (profileError) {
        console.log(`No profile found for user: ${authUser.user.id}`)
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
        // Use the logo_url from the profile directly
        logoUrl = profile.logo_url || null
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
