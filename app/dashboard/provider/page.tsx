'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'

export default function ProviderRedirect() {
  const router = useRouter()

  useEffect(() => {
    const redirectToPersonalDashboard = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Redirect to personalized provider dashboard
          router.replace(`/dashboard/provider/${user.id}`)
        } else {
          // Redirect to sign in if not authenticated
          router.replace('/auth/sign-in')
        }
      } catch (error) {
        console.error('Error redirecting to provider dashboard:', error)
        // Fallback to sign in
        router.replace('/auth/sign-in')
      }
    }

    redirectToPersonalDashboard()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
