'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { z, ZodSchema } from 'zod'

export interface ValidationState<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isValid: boolean
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  schema: ZodSchema<T>,
  { validateOnChange = true, validateOnBlur = true }: { validateOnChange?: boolean; validateOnBlur?: boolean } = {}
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})

  const runValidation = useCallback((current: T) => {
    try {
      schema.parse(current)
      setErrors({})
      return true
    } catch (e) {
      if (e instanceof z.ZodError) {
        const next: Partial<Record<keyof T, string>> = {}
        e.errors.forEach(err => {
          const path = err.path[0] as keyof T
          next[path] = err.message
        })
        setErrors(next)
        return false
      }
      return false
    }
  }, [schema])

  const onChange = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => {
      const next = { ...prev, [key]: value }
      if (validateOnChange) runValidation(next)
      return next
    })
  }, [runValidation, validateOnChange])

  const onBlur = useCallback(<K extends keyof T>(key: K) => {
    setTouched(prev => ({ ...prev, [key]: true }))
    if (validateOnBlur) runValidation(values)
  }, [values, runValidation, validateOnBlur])

  const validate = useCallback(() => runValidation(values), [values, runValidation])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const state: ValidationState<T> = useMemo(() => ({
    values,
    errors,
    touched,
    isValid: Object.keys(errors).length === 0
  }), [values, errors, touched])

  return { state, setValues, onChange, onBlur, validate, reset }
}


