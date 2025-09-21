/**
 * React Hook for Suggestion Engine
 * Provides intelligent recommendations and suggestions
 */

import { useState, useEffect, useCallback } from 'react'
import { suggestionEngine, Suggestion } from '@/lib/suggestion-engine'
import { useDashboardData } from './useDashboardData'

export function useSuggestions() {
  const { users, services, bookings, invoices, loading, error } = useDashboardData()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)

  // Generate suggestions when data changes
  const generateSuggestions = useCallback(async () => {
    if (loading || !users.length) return

    try {
      setLoadingSuggestions(true)
      setSuggestionError(null)

      const newSuggestions = suggestionEngine.generateSuggestions({
        users,
        services,
        bookings,
        invoices
      })

      setSuggestions(newSuggestions)
    } catch (err) {
      setSuggestionError(err instanceof Error ? err.message : 'Failed to generate suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }, [users, services, bookings, invoices, loading])

  // Generate suggestions when data is loaded
  useEffect(() => {
    if (!loading && users.length > 0) {
      generateSuggestions()
    }
  }, [loading, users.length, generateSuggestions])

  // Get suggestions by type
  const getServiceSuggestions = useCallback(() => {
    return suggestions.filter(suggestion => suggestion.type === 'service')
  }, [suggestions])

  const getUserSuggestions = useCallback(() => {
    return suggestions.filter(suggestion => suggestion.type === 'user')
  }, [suggestions])

  const getBusinessSuggestions = useCallback(() => {
    return suggestions.filter(suggestion => suggestion.type === 'business')
  }, [suggestions])

  // Get high priority suggestions
  const getHighPrioritySuggestions = useCallback(() => {
    return suggestions.filter(suggestion => suggestion.priority === 'high')
  }, [suggestions])

  // Get suggestion statistics
  const getSuggestionStats = useCallback(() => {
    return suggestionEngine.getSuggestionStats()
  }, [])

  // Refresh suggestions
  const refreshSuggestions = useCallback(() => {
    generateSuggestions()
  }, [generateSuggestions])

  return {
    // Data
    suggestions,
    serviceSuggestions: getServiceSuggestions(),
    userSuggestions: getUserSuggestions(),
    businessSuggestions: getBusinessSuggestions(),
    highPrioritySuggestions: getHighPrioritySuggestions(),
    
    // State
    loading: loadingSuggestions,
    error: suggestionError,
    
    // Actions
    refreshSuggestions,
    getSuggestionStats
  }
}

// Hook for specific suggestion types
export function useServiceSuggestions() {
  const { serviceSuggestions, loading, error, refreshSuggestions } = useSuggestions()
  return { suggestions: serviceSuggestions, loading, error, refreshSuggestions }
}

export function useUserSuggestions() {
  const { userSuggestions, loading, error, refreshSuggestions } = useSuggestions()
  return { suggestions: userSuggestions, loading, error, refreshSuggestions }
}

export function useBusinessSuggestions() {
  const { businessSuggestions, loading, error, refreshSuggestions } = useSuggestions()
  return { suggestions: businessSuggestions, loading, error, refreshSuggestions }
}
