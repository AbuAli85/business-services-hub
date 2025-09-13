'use client'

import React from 'react'
import { FileText, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="mb-4">
        {icon || <FileText className="h-12 w-12 text-gray-400" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-6 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Specialized empty state for invoice not found
interface InvoiceNotFoundProps {
  onRetry?: () => void
  onBack?: () => void
  className?: string
}

export function InvoiceNotFound({ onRetry, onBack, className }: InvoiceNotFoundProps) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-red-400" />}
      title="Invoice Not Found"
      description="The invoice you're looking for doesn't exist or you don't have permission to view it."
      action={onRetry ? {
        label: 'Try Again',
        onClick: onRetry
      } : undefined}
      className={className}
    />
  )
}

// Specialized empty state for loading error
interface LoadingErrorProps {
  error: string
  onRetry?: () => void
  className?: string
}

export function LoadingError({ error, onRetry, className }: LoadingErrorProps) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-red-400" />}
      title="Something went wrong"
      description={error}
      action={onRetry ? {
        label: 'Retry',
        onClick: onRetry
      } : undefined}
      className={className}
    />
  )
}
