'use client'

import { useRef, useEffect } from 'react'

/**
 * Hook to track and log component render counts
 * Useful for debugging infinite render loops
 */
export function useRenderCount(componentName: string, warnThreshold = 10) {
  const renders = useRef(0)
  const mountTime = useRef(Date.now())
  
  useEffect(() => {
    renders.current++
    const elapsed = Date.now() - mountTime.current
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] Render #${renders.current} (${elapsed}ms since mount)`)
      
      if (renders.current > warnThreshold) {
        console.error(`⚠️ ${componentName} rendered ${renders.current} times! This might indicate an infinite loop.`)
        console.trace() // Show call stack
      }
    }
  })
  
  return renders.current
}
