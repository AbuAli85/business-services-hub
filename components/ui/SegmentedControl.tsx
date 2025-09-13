'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SegmentedControlOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  size = 'md',
  disabled = false
}: SegmentedControlProps) {
  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base'
  }

  const paddingClasses = {
    sm: 'px-2',
    md: 'px-3',
    lg: 'px-4'
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-1',
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => !disabled && onChange(option.value)}
          className={cn(
            'flex items-center gap-2 rounded-md font-medium transition-all duration-200',
            paddingClasses[size],
            value === option.value
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
            disabled && 'cursor-not-allowed hover:bg-transparent hover:text-gray-600'
          )}
          disabled={disabled}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Convenience component for view mode toggle
interface ViewModeToggleProps {
  value: 'modern' | 'template'
  onChange: (value: 'modern' | 'template') => void
  className?: string
}

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  const options: SegmentedControlOption[] = [
    { value: 'template', label: 'Template' },
    { value: 'modern', label: 'Modern' }
  ]

  return (
    <SegmentedControl
      options={options}
      value={value}
      onChange={onChange}
      className={className}
      size="sm"
    />
  )
}
