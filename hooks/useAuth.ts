import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase-client'

export interface User {
  id: string
  email?: string
  user_metadata?: {
    role?: string
  }
}

export interface AuthState {
  user: User | null
  userRole: 'client' | 'provider' | 'admin' | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    userRole: null,
    loading: true,
    error: null
  })

  const initializeUser = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const supabase = await getSupabaseClient()
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !currentUser) {
        setState(prev => ({
          ...prev,
          user: null,
          userRole: null,
          loading: false
        }))
        return
      }
      
      // Determine user role from metadata first, then profile
      let detectedRole = currentUser.user_metadata?.role
      
      if (!detectedRole) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role, is_admin')
            .eq('id', currentUser.id)
            .single()
          
          if (!profileError && profile) {
            detectedRole = profile.is_admin ? 'admin' : profile.role
          }
        } catch (profileError) {
          console.warn('⚠️ Could not fetch profile role:', profileError)
        }
      }
      
      // Default to client if no role found
      if (!detectedRole) {
        detectedRole = 'client'
      }
      
      setState(prev => ({
        ...prev,
        user: currentUser,
        userRole: detectedRole as 'client' | 'provider' | 'admin',
        loading: false
      }))
      
    } catch (error) {
      console.error('❌ User initialization error:', error)
      setState(prev => ({
        ...prev,
        error: 'Failed to initialize user session',
        loading: false
      }))
    }
  }, [])

  useEffect(() => {
    initializeUser()
  }, [initializeUser])

  const signOut = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      await supabase.auth.signOut()
      setState({
        user: null,
        userRole: null,
        loading: false,
        error: null
      })
      router.push('/auth/sign-in')
    } catch (error) {
      console.error('❌ Sign out error:', error)
    }
  }, [router])

  return {
    ...state,
    signOut
  }
}