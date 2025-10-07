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
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
      )
      
      const fetchPromise = supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', userId)
        .single()
      
      const { data: profile, error: profileError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any
      
      if (profileError) {
        console.warn('⚠️ Profile fetch error:', profileError)
        // If it's a 500 error, it's likely an RLS policy issue
        if (profileError.code === 'PGRST301' || profileError.message?.includes('500')) {
          console.error('❌ RLS Policy Error detected - please run the fix-rls script')
        }
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
      
      // Add a global timeout for the entire initialization
      const initTimeout = setTimeout(() => {
        console.error('❌ TIMEOUT: User initialization taking too long, forcing completion')
        setState(prev => {
          if (prev.loading) {
            return {
              ...prev,
              loading: false,
              error: 'Session initialization timeout'
            }
          }
          return prev
        })
      }, 4000) // 4 second global timeout
      
      try {
        // First try to get session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          clearTimeout(initTimeout)
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
          clearTimeout(initTimeout)
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
        
        // Determine user role from metadata first (instant)
        let detectedRole = currentUser.user_metadata?.role
        console.log('📋 Role from metadata:', detectedRole)
        
        // If no role in metadata, try profile (with timeout)
        if (!detectedRole) {
          console.log('🔍 Attempting to fetch role from profile...')
          const rolePromise = fetchUserRole(currentUser.id, supabase)
          const roleTimeout = new Promise(resolve => setTimeout(() => resolve(null), 2000))
          
          detectedRole = await Promise.race([rolePromise, roleTimeout]) as string | null
          
          if (!detectedRole) {
            console.warn('⚠️ Profile role fetch failed/timed out')
          }
        }
        
        // Default to client if no role found
        if (!detectedRole) {
          console.warn('⚠️ No role found anywhere, defaulting to client')
          detectedRole = 'client'
        }
        
        console.log('✅ Final role:', detectedRole)
        
        clearTimeout(initTimeout)
        setState({
          user: currentUser,
          userRole: detectedRole as 'client' | 'provider' | 'admin',
          loading: false,
          error: null
        })
      } catch (innerError) {
        clearTimeout(initTimeout)
        throw innerError
      }
      
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