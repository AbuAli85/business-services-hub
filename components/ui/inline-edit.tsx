'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, X, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineEditProps {
  value: string
  onSave: (newValue: string) => Promise<void> | void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxLength?: number
  validate?: (value: string) => string | null
  size?: 'sm' | 'md' | 'lg'
  showEditIcon?: boolean
}

export function InlineEdit({
  value,
  onSave,
  placeholder = 'Click to edit',
  className,
  disabled = false,
  maxLength = 255,
  validate,
  size = 'md',
  showEditIcon = true,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleStartEdit = () => {
    if (disabled) return
    setIsEditing(true)
    setEditValue(value)
    setError(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
    setError(null)
  }

  const handleSave = async () => {
    if (disabled || isLoading) return

    // Validate input
    if (validate) {
      const validationError = validate(editValue)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    // Check if value actually changed
    if (editValue.trim() === value.trim()) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onSave(editValue.trim())
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const sizeClasses = {
    sm: 'text-sm h-8',
    md: 'text-base h-10',
    lg: 'text-lg h-12',
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isLoading}
          className={cn(
            sizeClasses[size],
            error && 'border-red-500 focus:border-red-500',
            className
          )}
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-2 w-full">
      <div
        onClick={handleStartEdit}
        className={cn(
          'flex-1 cursor-pointer rounded-md px-3 py-2 transition-colors',
          'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
          sizeClasses[size],
          disabled && 'cursor-not-allowed opacity-50',
          !value && 'text-gray-400 italic',
          className
        )}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleStartEdit()
          }
        }}
        role="button"
        aria-label={`Edit ${placeholder}`}
      >
        {value || placeholder}
      </div>
      {showEditIcon && !disabled && (
        <Edit2 className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  )
}

// Specialized components for common use cases
export function InlineEditTitle({
  value,
  onSave,
  className,
  disabled = false,
}: Omit<InlineEditProps, 'placeholder' | 'size'>) {
  return (
    <InlineEdit
      value={value}
      onSave={onSave}
      placeholder="Enter title..."
      size="lg"
      className={cn('font-semibold', className)}
      disabled={disabled}
      validate={(val) => {
        if (!val.trim()) return 'Title is required'
        if (val.length < 3) return 'Title must be at least 3 characters'
        if (val.length > 255) return 'Title cannot exceed 255 characters'
        return null
      }}
    />
  )
}

export function InlineEditDescription({
  value,
  onSave,
  className,
  disabled = false,
}: Omit<InlineEditProps, 'placeholder' | 'size'>) {
  return (
    <InlineEdit
      value={value}
      onSave={onSave}
      placeholder="Enter description..."
      size="sm"
      className={cn('text-gray-600', className)}
      disabled={disabled}
      maxLength={2000}
      validate={(val) => {
        if (val.length > 2000) return 'Description cannot exceed 2000 characters'
        return null
      }}
    />
  )
}
