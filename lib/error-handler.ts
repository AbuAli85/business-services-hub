/**
 * Global error handler for DOM-related errors
 */

export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.name === 'InvalidNodeTypeError') {
      console.warn('DOM manipulation error caught:', event.reason)
      event.preventDefault() // Prevent the error from being logged to console
    }
  })

  // Handle general errors
  window.addEventListener('error', (event) => {
    if (event.error?.name === 'InvalidNodeTypeError') {
      console.warn('DOM manipulation error caught:', event.error)
      event.preventDefault() // Prevent the error from being logged to console
    }
  })

  // Override console.error to filter out known third-party errors
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ')
    
    // Filter out known third-party DOM errors
    if (
      errorMessage.includes('InvalidNodeTypeError') ||
      errorMessage.includes('Failed to execute \'selectNode\' on \'Range\'') ||
      errorMessage.includes('instrument.')
    ) {
      console.warn('Filtered third-party DOM error:', ...args)
      return
    }
    
    originalConsoleError.apply(console, args)
  }
}

// Initialize error handlers
if (typeof window !== 'undefined') {
  setupGlobalErrorHandlers()
}
