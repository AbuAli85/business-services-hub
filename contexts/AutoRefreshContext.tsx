/**
 * Centralized Auto-Refresh Control Context
 * Manages global auto-refresh state and provides controls for Live Mode
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AutoRefreshContextType {
  isLiveMode: boolean
  toggleLiveMode: () => void
  refreshInterval: number
  isRefreshing: boolean
  setRefreshing: (refreshing: boolean) => void
  refreshCallbacks: Set<() => void>
  registerRefreshCallback: (callback: () => void) => () => void
  triggerRefresh: () => void
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
  const [isLiveMode, setIsLiveMode] = useState(() => {
    // DISABLED by default to prevent constant reloading
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-live-mode')
      // Explicitly check for 'true' and default to false
      return saved === 'true' ? false : false // Force disabled for now
    }
    return false
  })
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshCallbacks, setRefreshCallbacks] = useState<Set<() => void>>(new Set())
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
    setRefreshCallbacks(prev => new Set(prev).add(callback))
    
    // Return cleanup function
    return () => {
      setRefreshCallbacks(prev => {
        const newSet = new Set(prev)
        newSet.delete(callback)
        return newSet
      })
    }
  }, [])

  const triggerRefresh = useCallback(() => {
    if (isRefreshing) return // Prevent concurrent refreshes
    
    console.log('🔄 Auto-refresh triggered, callbacks:', refreshCallbacks.size)
    setIsRefreshing(true)
    
    // Execute all registered refresh callbacks
    const promises = Array.from(refreshCallbacks).map(callback => {
      try {
        return Promise.resolve(callback())
      } catch (error) {
        console.error('Refresh callback error:', error)
        return Promise.resolve()
      }
    })
    
    Promise.all(promises).finally(() => {
      setIsRefreshing(false)
    })
  }, [refreshCallbacks, isRefreshing])

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
    refreshCallbacks,
    registerRefreshCallback,
    triggerRefresh
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
