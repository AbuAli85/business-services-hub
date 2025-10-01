'use client'

import React from 'react'

interface BrandLoaderProps {
  size?: number
  className?: string
}

export function BrandLoader({ size = 56, className = '' }: BrandLoaderProps) {
  const dim = `${size}px`

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} aria-busy="true" aria-live="polite">
      <div className="relative" style={{ width: dim, height: dim }}>
        <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-40" />
        <div className="rounded-full w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-semibold shadow-sm">
          SP
        </div>
        <div className="absolute -inset-1 rounded-full border-2 border-blue-200 animate-spin" style={{ borderTopColor: 'transparent' }} />
      </div>
      <div className="mt-3 text-sm text-gray-600">Loading…</div>
    </div>
  )
}

export default BrandLoader


