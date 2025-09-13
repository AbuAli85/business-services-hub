'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { getStatusVariant, getStatusText } from '@/lib/utils/invoiceHelpers'

interface StatusBadgeProps {
  status: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const statusIcons = {
  draft: '📝',
  issued: '📤',
  paid: '✅',
  overdue: '⚠️',
  cancelled: '❌'
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  issued: 'bg-blue-100 text-blue-800 border-blue-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200'
}

export function StatusBadge({ 
  status, 
  className, 
  size = 'md',
  showIcon = true 
}: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  }

  const iconSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        sizeClasses[size],
        statusColors[status as keyof typeof statusColors] || statusColors.draft,
        className
      )}
    >
      {showIcon && (
        <span className={iconSize[size]}>
          {statusIcons[status as keyof typeof statusIcons] || '📝'}
        </span>
      )}
      {getStatusText(status)}
    </span>
  )
}

// Convenience component for invoice status
interface InvoiceStatusBadgeProps {
  invoice: { status: string } | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function InvoiceStatusBadge({ 
  invoice, 
  className, 
  size = 'md',
  showIcon = true 
}: InvoiceStatusBadgeProps) {
  if (!invoice) return null

  return (
    <StatusBadge
      status={invoice.status}
      className={className}
      size={size}
      showIcon={showIcon}
    />
  )
}
