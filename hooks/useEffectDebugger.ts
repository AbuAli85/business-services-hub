'use client'

import { useRef, useEffect } from 'react'

/**
 * Hook to debug useEffect dependencies and track changes
 * Helps identify what's causing effects to re-run
 */
export function useEffectDebugger(effectName: string, dependencies: any[]) {
  const previousDeps = useRef(dependencies)
  const isFirstRender = useRef(true)
  
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${effectName}] First render - dependencies:`, dependencies)
      }
      return
    }
    
    const changedDeps = dependencies.reduce((acc, dep, index) => {
      const previousDep = previousDeps.current[index]
      
      if (previousDep !== dep) {
        acc.push({
          index,
          name: typeof dep === 'function' ? 'function' : typeof dep === 'object' ? 'object' : String(dep),
          previous: previousDep,
          current: dep,
          changed: true
        })
      }
      
      return acc
    }, [] as Array<{
      index: number
      name: string
      previous: any
      current: any
      changed: boolean
    }>)
    
    if (changedDeps.length > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[${effectName}] Dependencies changed:`, changedDeps)
      
      // Warn about common issues
      changedDeps.forEach(change => {
        if (typeof change.current === 'function') {
          console.warn(`⚠️ ${effectName}: Function dependency at index ${change.index} changed - consider useCallback`)
        }
        if (typeof change.current === 'object' && change.current !== null) {
          console.warn(`⚠️ ${effectName}: Object dependency at index ${change.index} changed - consider useMemo`)
        }
      })
    }
    
    previousDeps.current = dependencies
  })
}

/**
 * Hook to track when effects run and why
 */
export function useEffectTracker(effectName: string) {
  const runCount = useRef(0)
  const lastRunTime = useRef<number>()
  
  useEffect(() => {
    runCount.current++
    const now = Date.now()
    const timeSinceLastRun = lastRunTime.current ? now - lastRunTime.current : 0
    lastRunTime.current = now
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${effectName}] Effect ran #${runCount.current}${timeSinceLastRun > 0 ? ` (${timeSinceLastRun}ms since last run)` : ''}`)
    }
  })
  
  return runCount.current
}
