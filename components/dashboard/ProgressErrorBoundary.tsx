'use client'

import React from 'react'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: undefined }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    // Optionally report error to a monitoring service here
    // console.error('ProgressErrorBoundary caught', error)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border rounded bg-red-50 text-red-700">
          <p>⚠️ Something went wrong: {this.state.error?.message}</p>
          <button onClick={this.handleReset} className="btn">Retry</button>
        </div>
      )
    }
    return this.props.children as React.ReactElement
  }
}

export default function ProgressErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  )
}


