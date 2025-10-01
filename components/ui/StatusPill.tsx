import React from 'react'
import { normalizeStatus, STATUS_LABEL, STATUS_TONE } from '@/lib/status'

export function StatusPill({ status }: { status?: string }) {
  const s = normalizeStatus(status)
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_TONE[s]}`}>
      {STATUS_LABEL[s]}
    </span>
  )
}


