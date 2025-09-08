/**
 * Performance utilities to prevent INP (Interaction to Next Paint) issues
 * and improve overall UI responsiveness
 */

/**
 * Creates a non-blocking event handler that defers heavy operations
 * to prevent UI blocking and improve INP scores
 */
export function createNonBlockingHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R> | R,
  options: {
    deferHeavyWork?: boolean
    timeout?: number
    onStart?: () => void
    onComplete?: (result: R) => void
    onError?: (error: Error) => void
  } = {}
): (...args: T) => Promise<R> {
  const {
    deferHeavyWork = true,
    timeout = 50,
    onStart,
    onComplete,
    onError
  } = options

  return async (...args: T): Promise<R> => {
    // Call onStart immediately for better UX
    onStart?.()

    const execute = async () => {
      try {
        const result = await fn(...args)
        onComplete?.(result)
        return result
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        onError?.(err)
        throw err
      }
    }

    if (deferHeavyWork) {
      // Use requestIdleCallback for better performance
      if (typeof requestIdleCallback !== 'undefined') {
        return new Promise((resolve, reject) => {
          requestIdleCallback(
            async () => {
              try {
                const result = await execute()
                resolve(result)
              } catch (error) {
                reject(error)
              }
            },
            { timeout }
          )
        })
      } else {
        // Fallback to setTimeout
        return new Promise((resolve, reject) => {
          setTimeout(async () => {
            try {
              const result = await execute()
              resolve(result)
            } catch (error) {
              reject(error)
            }
          }, 0)
        })
      }
    }

    return execute()
  }
}

/**
 * Debounces function calls to prevent excessive execution
 */
export function debounce<T extends any[], R>(
  fn: (...args: T) => R,
  delay: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Throttles function calls to limit execution frequency
 */
export function throttle<T extends any[], R>(
  fn: (...args: T) => R,
  limit: number
): (...args: T) => void {
  let inThrottle: boolean = false

  return (...args: T) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Creates a loading manager to prevent multiple simultaneous operations
 */
export function createLoadingManager() {
  const activeOperations = new Set<string>()

  return {
    isOperationActive: (operationId: string) => activeOperations.has(operationId),
    
    startOperation: (operationId: string) => {
      activeOperations.add(operationId)
    },
    
    endOperation: (operationId: string) => {
      activeOperations.delete(operationId)
    },
    
    withOperation: async <T>(
      operationId: string,
      operation: () => Promise<T>
    ): Promise<T> => {
      if (activeOperations.has(operationId)) {
        throw new Error(`Operation ${operationId} is already in progress`)
      }
      
      activeOperations.add(operationId)
      try {
        return await operation()
      } finally {
        activeOperations.delete(operationId)
      }
    }
  }
}

/**
 * Optimizes heavy operations by breaking them into chunks
 */
export function createChunkedProcessor<T>(
  items: T[],
  processor: (chunk: T[]) => Promise<void>,
  chunkSize: number = 10
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize)
        await processor(chunk)
        
        // Yield control to the browser between chunks
        await new Promise(resolve => setTimeout(resolve, 0))
      }
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Creates a performance-optimized button click handler
 */
export function createOptimizedClickHandler(
  handler: () => void | Promise<void>,
  options: {
    preventDoubleClick?: boolean
    showLoading?: boolean
    timeout?: number
  } = {}
) {
  const {
    preventDoubleClick = true,
    showLoading = false,
    timeout = 50
  } = options

  let isProcessing = false

  return async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (preventDoubleClick && isProcessing) {
      return
    }

    isProcessing = true

    // Show loading state if needed
    if (showLoading) {
      const button = event.currentTarget
      const originalText = button.textContent
      button.textContent = 'Processing...'
      button.disabled = true
    }

    try {
      // Defer execution to prevent UI blocking
      if (typeof requestIdleCallback !== 'undefined') {
        await new Promise<void>((resolve) => {
          requestIdleCallback(async () => {
            try {
              const result = handler()
              if (result instanceof Promise) {
                await result
              }
              resolve()
            } catch (error) {
              resolve()
            }
          }, { timeout })
        })
      } else {
        await new Promise<void>((resolve) => {
          setTimeout(async () => {
            try {
              const result = handler()
              if (result instanceof Promise) {
                await result
              }
              resolve()
            } catch (error) {
              resolve()
            }
          }, 0)
        })
      }
    } finally {
      isProcessing = false

      // Restore button state if needed
      if (showLoading) {
        const button = event.currentTarget
        button.disabled = false
        // Note: You might want to restore original text here
      }
    }
  }
}

/**
 * Measures and logs performance metrics
 */
export function measurePerformance<T>(
  name: string,
  operation: () => T | Promise<T>
): Promise<T> {
  const start = performance.now()
  
  return Promise.resolve(operation()).then(
    (result) => {
      const end = performance.now()
      console.log(`⚡ ${name} took ${(end - start).toFixed(2)}ms`)
      return result
    },
    (error) => {
      const end = performance.now()
      console.error(`❌ ${name} failed after ${(end - start).toFixed(2)}ms:`, error)
      throw error
    }
  )
}

/**
 * Creates a performance-optimized state updater
 */
export function createOptimizedStateUpdater<T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  options: {
    debounceMs?: number
    throttleMs?: number
  } = {}
) {
  const { debounceMs, throttleMs } = options

  if (debounceMs) {
    return debounce(setState, debounceMs)
  }

  if (throttleMs) {
    return throttle(setState, throttleMs)
  }

  return setState
}
