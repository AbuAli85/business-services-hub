/**
 * Request logging utility for debugging API calls
 * Helps identify duplicate requests and performance issues
 */

interface RequestLog {
  url: string
  method: string
  startTime: number
  endTime?: number
  duration?: number
  status?: number
  error?: Error
}

class RequestLogger {
  private requests = new Map<string, RequestLog>()
  private isEnabled = false

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development'
  }

  startRequest(url: string, method: string = 'GET'): string {
    if (!this.isEnabled) return url

    const requestId = `${method}:${url}:${Date.now()}`
    const log: RequestLog = {
      url,
      method,
      startTime: performance.now()
    }

    this.requests.set(requestId, log)
    console.log(`→ [${method}] ${url}`)
    
    return requestId
  }

  endRequest(requestId: string, status?: number, error?: Error) {
    if (!this.isEnabled) return

    const log = this.requests.get(requestId)
    if (!log) return

    log.endTime = performance.now()
    log.duration = log.endTime - log.startTime
    log.status = status
    log.error = error

    const statusIcon = status && status >= 400 ? '❌' : '✅'
    const duration = log.duration.toFixed(2)
    
    if (error) {
      console.error(`❌ [${log.method}] ${log.url} - ${error.message} (${duration}ms)`)
    } else {
      console.log(`${statusIcon} [${log.method}] ${log.url} - ${status || 'OK'} (${duration}ms)`)
    }

    // Warn about slow requests
    if (log.duration > 3000) {
      console.warn(`⚠️ Slow request: ${log.url} took ${duration}ms`)
    }

    // Warn about duplicate requests
    this.checkForDuplicates(log.url, log.method)

    this.requests.delete(requestId)
  }

  private checkForDuplicates(url: string, method: string) {
    const recentRequests = Array.from(this.requests.values())
      .filter(req => req.url === url && req.method === method)
      .filter(req => performance.now() - req.startTime < 1000) // Within last second

    if (recentRequests.length > 0) {
      console.warn(`⚠️ Potential duplicate request: ${method} ${url}`)
      console.warn('Active requests:', recentRequests.map(r => `${r.startTime.toFixed(2)}ms ago`))
    }
  }

  getActiveRequests(): RequestLog[] {
    return Array.from(this.requests.values())
  }

  clear() {
    this.requests.clear()
  }
}

export const requestLogger = new RequestLogger()

/**
 * Wraps fetch to automatically log requests
 */
export function loggedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString()
  const method = init?.method || 'GET'
  
  const requestId = requestLogger.startRequest(url, method)
  
  return fetch(input, init)
    .then(response => {
      requestLogger.endRequest(requestId, response.status)
      return response
    })
    .catch(error => {
      requestLogger.endRequest(requestId, undefined, error)
      throw error
    })
}

/**
 * Hook to monitor request patterns in components
 */
export function useRequestMonitor(componentName: string) {
  const requestCount = useRef(0)
  
  useEffect(() => {
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    
    // Intercept request logs for this component
    console.log = (...args) => {
      if (args[0]?.includes('→') || args[0]?.includes('✅')) {
        requestCount.current++
        console.log(`[${componentName}]`, ...args)
      } else {
        originalConsoleLog(...args)
      }
    }
    
    console.error = (...args) => {
      if (args[0]?.includes('❌')) {
        console.error(`[${componentName}]`, ...args)
      } else {
        originalConsoleError(...args)
      }
    }
    
    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
    }
  }, [componentName])
  
  return requestCount.current
}
