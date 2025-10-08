'use client'

import { useEffect, useRef } from 'react'

export function usePageStability(pageName: string) {
  const renderCount = useRef(0)
  const mountTime = useRef(Date.now())

  useEffect(() => {
    renderCount.current++
    
    // Warn if too many renders
    if (renderCount.current > 10) {
      console.warn(
        `[Stability Warning] ${pageName} rendered ${renderCount.current} times`
      )
    }

    // Log component lifecycle in development
    if (process.env.NODE_ENV === 'development') {
      const elapsed = Date.now() - mountTime.current
      console.log(`[${pageName}] Render #${renderCount.current} (${elapsed}ms since mount)`)
    }

    return () => {
      // Cleanup detection
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${pageName}] Cleanup after ${renderCount.current} renders`)
      }
    }
  })

  return renderCount.current
}
