/**
 * Performance utilities to prevent UI blocking during async operations
 */

/**
 * Wraps an async function to prevent UI blocking by deferring heavy operations
 * @param fn - The async function to wrap
 * @param options - Options for execution
 * @returns A wrapped function that executes without blocking the UI
 */
export function createNonBlockingHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    deferHeavyWork?: boolean
    timeout?: number
    onStart?: () => void
    onComplete?: (result: R) => void
    onError?: (error: Error) => void
  } = {}
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const { deferHeavyWork = true, timeout = 100, onStart, onComplete, onError } = options

    try {
      // Call onStart immediately
      onStart?.()

      if (deferHeavyWork) {
        // Defer execution to next tick to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      // Execute the function
      const result = await fn(...args)
      
      // Call onComplete
      onComplete?.(result)
      
      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      onError?.(errorObj)
      throw errorObj
    }
  }
}

/**
 * Debounces a function to prevent rapid successive calls
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns A debounced function
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
    
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Throttles a function to limit execution frequency
 * @param fn - The function to throttle
 * @param limit - Minimum time between executions in milliseconds
 * @returns A throttled function
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
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Creates a loading state manager to prevent multiple simultaneous operations
 * @returns Loading state manager
 */
export function createLoadingManager() {
  let isLoading = false
  let loadingPromise: Promise<any> | null = null

  return {
    get isLoading() {
      return isLoading
    },
    
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (isLoading && loadingPromise) {
        // Wait for existing operation to complete
        return loadingPromise
      }

      isLoading = true
      loadingPromise = fn()
      
      try {
        const result = await loadingPromise
        return result
      } finally {
        isLoading = false
        loadingPromise = null
      }
    },

    reset() {
      isLoading = false
      loadingPromise = null
    }
  }
}

/**
 * Executes a function in a web worker to prevent main thread blocking
 * @param fn - The function to execute
 * @param args - Arguments to pass to the function
 * @returns Promise that resolves with the result
 */
export function executeInWorker<T, R>(
  fn: (data: T) => R,
  data: T
): Promise<R> {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') {
      // Fallback for environments without Web Workers
      try {
        const result = fn(data)
        resolve(result)
      } catch (error) {
        reject(error)
      }
      return
    }

    const workerCode = `
      self.onmessage = function(e) {
        try {
          const fn = ${fn.toString()};
          const result = fn(e.data);
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    `

    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const worker = new Worker(URL.createObjectURL(blob))

    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.result)
      } else {
        reject(new Error(e.data.error))
      }
      worker.terminate()
    }

    worker.onerror = (error) => {
      reject(error)
      worker.terminate()
    }

    worker.postMessage(data)
  })
}
