'use client'

import { Badge } from '@/components/ui/badge'

export type StatusKind = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'inactive' | 'active'

export function normalizeStatus(status?: string | null): StatusKind {
  const s = String(status || '').toLowerCase()
  if (s === 'approved' || s === 'confirmed') return 'confirmed'
  if (s === 'in_production' || s === 'in_progress') return 'in_progress'
  if (s === 'delivered' || s === 'completed') return 'completed'
  if (s === 'canceled' || s === 'cancelled') return 'cancelled'
  if (s === 'on_hold') return 'on_hold'
  if (s === 'active') return 'active'
  if (s === 'inactive') return 'inactive'
  return 'pending'
}

export function BookingStatusBadge({ status }: { status?: string | null }) {
  const kind = normalizeStatus(status)
  const map: Record<StatusKind, string> = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-violet-50 text-violet-700 border-violet-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    on_hold: 'bg-orange-50 text-orange-700 border-orange-200',
    inactive: 'bg-slate-50 text-slate-700 border-slate-200',
    active: 'bg-blue-50 text-blue-700 border-blue-200'
  }
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${map[kind]}`}>
      {kind.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </Badge>
  )
}

// invoice status badges (keep in same client file; directive already at top)
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

export function InvoiceStatusChip({ 
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

// Convenience component that takes full invoice object
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
    <InvoiceStatusChip
      status={invoice.status}
      className={className}
      size={size}
      showIcon={showIcon}
    />
  )
}

export default InvoiceStatusBadge
