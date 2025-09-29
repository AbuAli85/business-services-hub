'use client'

import React from 'react'

type Status = 'default' | 'success' | 'error' | 'warning'

export interface FormFieldProps {
  label?: string
  helpText?: string
  error?: string
  status?: Status
  children: React.ReactNode
  id?: string
  required?: boolean
  className?: string
}

export default function FormField({
  label,
  helpText,
  error,
  status = 'default',
  children,
  id,
  required,
  className = ''
}: FormFieldProps) {
  const stateClass = status === 'success' ? 'is-valid' : status === 'error' ? 'is-error' : status === 'warning' ? 'is-warning' : ''
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-600">*</span>}
        </label>
      )}
      <div className={stateClass}>
        {children}
      </div>
      {error ? (
        <p className="form-error">{error}</p>
      ) : helpText ? (
        <p className="form-help">{helpText}</p>
      ) : null}
    </div>
  )
}


