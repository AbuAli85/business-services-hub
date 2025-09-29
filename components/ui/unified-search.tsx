'use client'

import React, { useEffect, useMemo, useState } from 'react'

export interface UnifiedSearchProps {
  placeholder?: string
  initialQuery?: string
  debounceMs?: number
  onSearch: (query: string) => void
  className?: string
  // Optional extra controls area (filters)
  rightSlot?: React.ReactNode
}

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function UnifiedSearch({
  placeholder = 'Search…',
  initialQuery = '',
  debounceMs = 250,
  onSearch,
  className = '',
  rightSlot
}: UnifiedSearchProps) {
  const [query, setQuery] = useState(initialQuery)
  const debounced = useDebouncedValue(query, debounceMs)

  useEffect(() => {
    onSearch(debounced.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <input
        className="form-input flex-1"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search"
      />
      {rightSlot}
    </div>
  )
}


