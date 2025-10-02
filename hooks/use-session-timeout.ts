'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { clearAuthData, isRefreshTokenError, safeSignOut, isSessionValid, getSessionTimeRemaining } from '@/lib/session-utils'

interface SessionTimeoutConfig {
  warningTime: number // seconds before expiry to show warning
  inactivityTimeout: number // seconds of inactivity before logout
  checkInterval: number // seconds between session checks
}

interface SessionTimeoutState {
  isWarning: boolean
  timeRemaining: number
  isInactive: boolean
  inactivityTimeRemaining: number
  isExpired: boolean
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
  warningTime: 300, // 5 minutes
  inactivityTimeout: 1800, // 30 minutes
  checkInterval: 30 // 30 seconds
}

export function useSessionTimeout(config: Partial<SessionTimeoutConfig> = {}) {
  const router = useRouter()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }
  
  const [state, setState] = useState<SessionTimeoutState>({
    isWarning: false,
    timeRemaining: 0,
    isInactive: false,
    inactivityTimeRemaining: mergedConfig.inactivityTimeout,
    isExpired: false
  })

  const lastActivityRef = useRef<number>(Date.now())
  const warningShownRef = useRef<boolean>(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Reset activity tracking
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setState(prev => ({
      ...prev,
      isInactive: false,
      inactivityTimeRemaining: mergedConfig.inactivityTimeout
    }))
  }, [mergedConfig.inactivityTimeout])

  // Check session expiry
  const checkSession = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.warn('Session check error:', error)
        // Handle specific refresh token errors
        if (isRefreshTokenError(error)) {
          console.log('🔄 Invalid refresh token detected, clearing session')
          await safeSignOut(supabase, { clearLocalStorage: true })
        }
        setState(prev => ({ ...prev, isExpired: true }))
        return
      }
      
      if (!session || !isSessionValid(session)) {
        setState(prev => ({ ...prev, isExpired: true }))
        return
      }

      const timeUntilExpiry = getSessionTimeRemaining(session)

      if (timeUntilExpiry <= 0) {
        setState(prev => ({ ...prev, isExpired: true }))
        return
      }

      // Check if warning should be shown
      const shouldShowWarning = timeUntilExpiry <= mergedConfig.warningTime && !warningShownRef.current
      
      setState(prev => ({
        ...prev,
        isWarning: shouldShowWarning,
        timeRemaining: timeUntilExpiry,
        isExpired: false
      }))

      if (shouldShowWarning) {
        warningShownRef.current = true
        toast.error(`Your session will expire in ${Math.ceil(timeUntilExpiry / 60)} minutes. Please save your work.`)
      }

    } catch (error) {
      console.error('Session check error:', error)
      setState(prev => ({ ...prev, isExpired: true }))
    }
  }, [mergedConfig.warningTime])

  // Check inactivity
  const checkInactivity = useCallback(() => {
    const now = Date.now()
    const timeSinceActivity = now - lastActivityRef.current
    const inactivitySeconds = Math.floor(timeSinceActivity / 1000)
    
    if (inactivitySeconds >= mergedConfig.inactivityTimeout) {
      setState(prev => ({
        ...prev,
        isInactive: true,
        inactivityTimeRemaining: 0
      }))
      toast.error('You have been inactive. You will be logged out shortly.')
    } else {
      const remaining = mergedConfig.inactivityTimeout - inactivitySeconds
      setState(prev => ({
        ...prev,
        isInactive: false,
        inactivityTimeRemaining: Math.max(0, remaining)
      }))
    }
  }, [mergedConfig.inactivityTimeout])

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      await safeSignOut(supabase, { clearLocalStorage: true })
      toast.success('You have been logged out due to session timeout.')
      router.push('/auth/sign-in')
    } catch (error) {
      console.error('Logout error:', error)
      // Clear auth data even if sign out fails
      clearAuthData({ clearLocalStorage: true })
      router.push('/auth/sign-in')
    }
  }, [router])

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const supabase = await getSupabaseClient()
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Session refresh error:', error)
        
        // Handle specific refresh token errors
        if (isRefreshTokenError(error)) {
          console.log('🔄 Invalid refresh token during refresh, signing out')
          await safeSignOut(supabase, { clearLocalStorage: true })
        }
        
        setState(prev => ({ ...prev, isExpired: true }))
        return false
      }

      if (data.session) {
        warningShownRef.current = false
        setState(prev => ({
          ...prev,
          isWarning: false,
          isExpired: false
        }))
        toast.success('Session refreshed successfully!')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Session refresh error:', error)
      
      // Handle refresh token errors in catch block too
      if (isRefreshTokenError(error)) {
        console.log('🔄 Invalid refresh token in catch block, signing out')
        try {
          const supabase = await getSupabaseClient()
          await safeSignOut(supabase, { clearLocalStorage: true })
        } catch (signOutError) {
          console.error('Error signing out:', signOutError)
        }
      }
      
      setState(prev => ({ ...prev, isExpired: true }))
      return false
    }
  }, [])

  // Set up intervals
  useEffect(() => {
    // Session check interval
    intervalRef.current = setInterval(checkSession, mergedConfig.checkInterval * 1000)
    
    // Inactivity check interval
    inactivityIntervalRef.current = setInterval(checkInactivity, 1000)

    // Initial check
    checkSession()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current)
    }
  }, [checkSession, checkInactivity, mergedConfig.checkInterval])

  // Handle session expiry
  useEffect(() => {
    if (state.isExpired) {
      handleLogout()
    }
  }, [state.isExpired, handleLogout])

  // Handle inactivity timeout
  useEffect(() => {
    if (state.isInactive && state.inactivityTimeRemaining <= 0) {
      handleLogout()
    }
  }, [state.isInactive, state.inactivityTimeRemaining, handleLogout])

  // Add activity listeners
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, resetActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetActivity, true)
      })
    }
  }, [resetActivity])

  return {
    ...state,
    refreshSession,
    resetActivity,
    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
  }
}
