'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.state.errorId
    
    // Log error for debugging
    logger.error('Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId
    })

    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // You can integrate with services like Sentry, LogRocket, etc.
      this.reportError(error, errorInfo, errorId)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.length > 0) {
        const hasResetKeyChanged = resetKeys.some((key, index) => 
          key !== prevProps.resetKeys?.[index]
        )
        if (hasResetKeyChanged) {
          this.resetErrorBoundary()
        }
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    // In a real application, you would send this to your error tracking service
    // Example: Sentry.captureException(error, { extra: { errorInfo, errorId } })
    console.error('Error reported to tracking service:', {
      error: error.message,
      errorId,
      timestamp: new Date().toISOString()
    })
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  handleRetry = () => {
    this.resetErrorBoundary()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-lg">
                We're sorry, but something unexpected happened. Our team has been notified.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Error ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{this.state.errorId}</code>
                </p>
                
                {this.props.showDetails && this.state.error && (
                  <details className="text-left bg-gray-50 p-4 rounded-lg">
                    <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                      Technical Details
                    </summary>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Error:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto max-h-32">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Go to Dashboard
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <Bug className="w-4 h-4" />
                    <span className="font-medium">Development Mode</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    This error boundary is in development mode. Check the console for more details.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    logger.error('Manual error report:', {
      error: error.message,
      stack: error.stack,
      errorInfo
    })
  }
}

export default ErrorBoundary
