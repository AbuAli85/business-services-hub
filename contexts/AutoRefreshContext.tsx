/**
 * Centralized Auto-Refresh Control Context
 * Manages global auto-refresh state and provides controls for Live Mode
 * 
 * NOTE: Live Mode is currently FORCE DISABLED to prevent reloading issues.
 * See LIVE_MODE_AUTO_REFRESH_FIX.md for details.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface AutoRefreshContextType {
  isLiveMode: boolean
  toggleLiveMode: () => void
  refreshInterval: number
  isRefreshing: boolean
  setRefreshing: (refreshing: boolean) => void
  refreshCallbacks: Set<() => void>
  registerRefreshCallback: (callback: () => void) => () => void
  triggerRefresh: () => void
  lastRefreshTime: number | null
}

const AutoRefreshContext = createContext<AutoRefreshContextType | undefined>(undefined)

interface AutoRefreshProviderProps {
  children: React.ReactNode
  defaultInterval?: number
}

export function AutoRefreshProvider({ 
  children, 
  defaultInterval = 30000 
}: AutoRefreshProviderProps) {
  // CRITICAL: Force disabled to prevent reloading - DO NOT CHANGE without thorough testing
  const [isLiveMode, setIsLiveMode] = useState(() => {
    // Always return false regardless of localStorage value
    // This prevents auto-refresh from causing constant page reloads
    return false
  })
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null)
  
  // Use useRef to avoid recreating Set on every render (performance optimization)
  const refreshCallbacksRef = useRef<Set<() => void>>(new Set())
  const refreshInterval = defaultInterval

  // Save to localStorage when live mode changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-live-mode', isLiveMode.toString())
    }
  }, [isLiveMode])

  const toggleLiveMode = useCallback(() => {
    setIsLiveMode(prev => !prev)
  }, [])

  const setRefreshing = useCallback((refreshing: boolean) => {
    setIsRefreshing(refreshing)
  }, [])

  const registerRefreshCallback = useCallback((callback: () => void) => {
    refreshCallbacksRef.current.add(callback)
    
    // Return cleanup function
    return () => {
      refreshCallbacksRef.current.delete(callback)
    }
  }, [])

  const triggerRefresh = useCallback(() => {
    if (isRefreshing) {
      console.warn('⚠️ Refresh already in progress, skipping...')
      return
    }
    
    const callbacks = refreshCallbacksRef.current
    if (callbacks.size === 0) {
      console.log('ℹ️ No refresh callbacks registered')
      return
    }
    
    console.log('🔄 Auto-refresh triggered, callbacks:', callbacks.size)
    setIsRefreshing(true)
    
    // Execute all registered refresh callbacks
    const promises = Array.from(callbacks).map(callback => {
      try {
        return Promise.resolve(callback())
      } catch (error) {
        console.error('❌ Refresh callback error:', error)
        return Promise.resolve()
      }
    })
    
    Promise.all(promises).finally(() => {
      setIsRefreshing(false)
      setLastRefreshTime(Date.now())
    })
  }, [isRefreshing])

  // Set up auto-refresh interval when live mode is enabled
  useEffect(() => {
    if (!isLiveMode) return

    const interval = setInterval(() => {
      triggerRefresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [isLiveMode, refreshInterval, triggerRefresh])

  const value: AutoRefreshContextType = {
    isLiveMode,
    toggleLiveMode,
    refreshInterval,
    isRefreshing,
    setRefreshing,
    refreshCallbacks: refreshCallbacksRef.current,
    registerRefreshCallback,
    triggerRefresh,
    lastRefreshTime
  }

  return (
    <AutoRefreshContext.Provider value={value}>
      {children}
    </AutoRefreshContext.Provider>
  )
}

export function useAutoRefresh() {
  const context = useContext(AutoRefreshContext)
  if (context === undefined) {
    throw new Error('useAutoRefresh must be used within an AutoRefreshProvider')
  }
  return context
}

// Hook for components that need to register refresh callbacks
export function useRefreshCallback(callback: () => void, deps: any[] = []) {
  const { registerRefreshCallback } = useAutoRefresh()
  
  useEffect(() => {
    const cleanup = registerRefreshCallback(callback)
    return cleanup
  }, [registerRefreshCallback, ...deps])
}
