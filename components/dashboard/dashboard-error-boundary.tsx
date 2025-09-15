'use client'

import React from 'react'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DashboardErrorBoundaryProps {
  children: React.ReactNode
  dashboardName?: string
  onRetry?: () => void
}

export function DashboardErrorBoundary({ 
  children, 
  dashboardName = 'Dashboard',
  onRetry 
}: DashboardErrorBoundaryProps) {
  const router = useRouter()

  const handleGoBack = () => {
    router.back()
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  const customFallback = (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            {dashboardName} Error
          </CardTitle>
          <CardDescription>
            Something went wrong while loading the {dashboardName.toLowerCase()}. 
            This might be a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <Button onClick={onRetry} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            )}
            <Button onClick={handleGoBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Button onClick={handleGoToDashboard} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Main Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <ErrorBoundary
      fallback={customFallback}
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        // Log dashboard-specific errors
        console.error(`Dashboard Error (${dashboardName}):`, {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        })
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// Specific error boundaries for different dashboard sections
export function ProviderDashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <DashboardErrorBoundary dashboardName="Provider Dashboard">
      {children}
    </DashboardErrorBoundary>
  )
}

export function ClientDashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <DashboardErrorBoundary dashboardName="Client Dashboard">
      {children}
    </DashboardErrorBoundary>
  )
}

export function AdminDashboardErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <DashboardErrorBoundary dashboardName="Admin Dashboard">
      {children}
    </DashboardErrorBoundary>
  )
}

export function ServicesErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <DashboardErrorBoundary dashboardName="Services">
      {children}
    </DashboardErrorBoundary>
  )
}

export function BookingsErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <DashboardErrorBoundary dashboardName="Bookings">
      {children}
    </DashboardErrorBoundary>
  )
}

export function InvoicesErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <DashboardErrorBoundary dashboardName="Invoices">
      {children}
    </DashboardErrorBoundary>
  )
}
