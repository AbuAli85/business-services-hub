import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase-client'

interface AuthState {
  user: any
  userRole: 'client' | 'provider' | 'admin' | null
  loading: boolean
  error: string | null
}

/**
 * Custom hook to manage authentication state
 * Consolidates user loading, authentication check, and role detection
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    userRole: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    let mounted = true
    
    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted && state.loading) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Authentication timeout. Please refresh.' 
        }))
      }
    }, 10000)

    const initialize = async () => {
      try {
        const supabase = await getSupabaseClient()
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

        if (!mounted) return

        if (userError || !currentUser) {
          setState({ user: null, userRole: null, loading: false, error: null })
          return
        }

        // Try to get role from user metadata first
        let detectedRole = currentUser.user_metadata?.role

        // Fallback to profile lookup
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
            console.warn('Could not fetch profile role:', profileError)
          }
        }

        if (!mounted) return

        // Default to client if no role found
        const finalRole = (detectedRole || 'client') as 'client' | 'provider' | 'admin'

        setState({
          user: currentUser,
          userRole: finalRole,
          loading: false,
          error: null
        })
      } catch (error: any) {
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: error?.message || 'Failed to initialize session' 
          }))
        }
      }
    }

    initialize()

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  return state
}


