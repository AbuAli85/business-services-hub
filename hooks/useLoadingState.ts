'use client'

import { useState, useCallback, useRef } from 'react'

export function useLoadingState(initialState = false) {
  const [loading, setLoading] = useState(initialState)
  const loadingCountRef = useRef(0)

  const startLoading = useCallback(() => {
    loadingCountRef.current++
    setLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    loadingCountRef.current--
    if (loadingCountRef.current <= 0) {
      loadingCountRef.current = 0
      setLoading(false)
    }
  }, [])

  const withLoading = useCallback(async <T,>(
    promise: Promise<T>
  ): Promise<T> => {
    startLoading()
    try {
      return await promise
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading])

  return { loading, startLoading, stopLoading, withLoading }
}
