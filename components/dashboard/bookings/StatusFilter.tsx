'use client'

import React from 'react'
import { FilterDropdown } from '@/components/dashboard/FilterDropdown'

export type BookingStatus = 'all' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface StatusCounts {
  all: number
  pending: number
  confirmed: number
  in_progress: number
  completed: number
  cancelled: number
}

export function StatusFilter({
  currentStatus,
  onStatusChange,
  counts
}: {
  currentStatus: BookingStatus
  onStatusChange: (status: BookingStatus) => void
  counts?: Partial<StatusCounts>
}) {
  const options = [
    { label: `All Bookings${counts?.all != null ? ` (${counts.all})` : ''}`, value: 'all' },
    { label: `Pending${counts?.pending != null ? ` (${counts.pending})` : ''}`, value: 'pending' },
    { label: `Confirmed${counts?.confirmed != null ? ` (${counts.confirmed})` : ''}`, value: 'confirmed' },
    { label: `In Progress${counts?.in_progress != null ? ` (${counts.in_progress})` : ''}`, value: 'in_progress' },
    { label: `Completed${counts?.completed != null ? ` (${counts.completed})` : ''}`, value: 'completed' },
    { label: `Cancelled${counts?.cancelled != null ? ` (${counts.cancelled})` : ''}`, value: 'cancelled' }
  ]

  return (
    <FilterDropdown
      label="Status"
      options={options}
      value={currentStatus}
      onChange={(v) => onStatusChange((v as BookingStatus) || 'all')}
    />
  )
}

export default StatusFilter


