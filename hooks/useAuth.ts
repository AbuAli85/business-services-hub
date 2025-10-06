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

  const fetchUserRole = useCallback(async (userId: string, supabase: any) => {
    try {
      console.log('🔍 Fetching role for user:', userId)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', userId)
        .single()
      
      if (profileError) {
        console.warn('⚠️ Profile fetch error:', profileError)
        return null
      }
      
      if (profile) {
        const role = profile.is_admin ? 'admin' : profile.role
        console.log('✅ Role fetched:', role)
        return role
      }
      
      return null
    } catch (error) {
      console.error('❌ Error fetching role:', error)
      return null
    }
  }, [])

  const initializeUser = useCallback(async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setState(prev => ({ ...prev, loading: true, error: null }))
      }
      
      console.log('🔐 Initializing user session...')
      const supabase = await getSupabaseClient()
      
      // First try to get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        setState({
          user: null,
          userRole: null,
          loading: false,
          error: sessionError.message
        })
        return
      }

      if (!session?.user) {
        console.log('⚠️ No active session found')
        setState({
          user: null,
          userRole: null,
          loading: false,
          error: null
        })
        return
      }

      const currentUser = session.user
      console.log('👤 User found:', currentUser.email)
      
      // Determine user role from metadata first, then profile
      let detectedRole = currentUser.user_metadata?.role
      console.log('📋 Role from metadata:', detectedRole)
      
      if (!detectedRole) {
        detectedRole = await fetchUserRole(currentUser.id, supabase)
      }
      
      // Default to client if no role found
      if (!detectedRole) {
        console.warn('⚠️ No role found, defaulting to client')
        detectedRole = 'client'
      }
      
      console.log('✅ Final role:', detectedRole)
      
      setState({
        user: currentUser,
        userRole: detectedRole as 'client' | 'provider' | 'admin',
        loading: false,
        error: null
      })
      
    } catch (error) {
      console.error('❌ User initialization error:', error)
      setState({
        user: null,
        userRole: null,
        loading: false,
        error: 'Failed to initialize user session'
      })
    }
  }, [fetchUserRole])

  useEffect(() => {
    let mounted = true
    let authListener: any = null

    const setupAuth = async () => {
      console.log('🚀 Setting up auth...')
      
      // Initial load
      await initializeUser()
      
      // Set up auth state listener
      const supabase = await getSupabaseClient()
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth state changed:', event)
        
        if (!mounted) return

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('✅ User signed in or token refreshed')
          await initializeUser(true)
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out')
          setState({
            user: null,
            userRole: null,
            loading: false,
            error: null
          })
        } else if (event === 'USER_UPDATED') {
          console.log('🔄 User updated')
          await initializeUser(true)
        }
      })

      authListener = subscription
    }

    setupAuth()

    return () => {
      mounted = false
      if (authListener) {
        console.log('🧹 Cleaning up auth listener')
        authListener.unsubscribe()
      }
    }
  }, [initializeUser])

  const signOut = useCallback(async () => {
    try {
      console.log('👋 Signing out...')
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
    signOut,
    refresh: initializeUser
  }
}