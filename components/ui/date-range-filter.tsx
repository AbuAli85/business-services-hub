'use client'

import React, { useEffect, useState } from 'react'

export interface DateRangeValue {
  from?: string // ISO
  to?: string   // ISO
}

interface DateRangeFilterProps {
  value?: DateRangeValue
  onChange: (value: DateRangeValue) => void
  className?: string
}

export default function DateRangeFilter({ value, onChange, className = '' }: DateRangeFilterProps) {
  const [from, setFrom] = useState(value?.from || '')
  const [to, setTo] = useState(value?.to || '')

  useEffect(() => {
    onChange({ from, to })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        type="date"
        className="form-input"
        value={from ? from.substring(0, 10) : ''}
        onChange={(e) => setFrom(e.target.value ? new Date(e.target.value).toISOString() : '')}
        aria-label="From date"
      />
      <span className="text-gray-500">to</span>
      <input
        type="date"
        className="form-input"
        value={to ? to.substring(0, 10) : ''}
        onChange={(e) => setTo(e.target.value ? new Date(e.target.value).toISOString() : '')}
        aria-label="To date"
      />
    </div>
  )
}


