/**
 * Zod validation schemas for Task forms
 * Provides type-safe validation with helpful error messages
 */

import { z } from 'zod'

// ============================================================================
// Task Validation Schemas
// ============================================================================

/**
 * UUID validation helper
 */
const uuidSchema = z
  .string()
  .uuid('Invalid UUID format')
  .optional()
  .or(z.literal(''))

/**
 * Schema for creating a new task
 */
export const createTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .trim(),
  
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'], {
      errorMap: () => ({ message: 'Invalid status' }),
    })
    .default('pending'),
  
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
  
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .or(z.literal('')),
  
  estimated_hours: z
    .number()
    .min(0, 'Estimated hours cannot be negative')
    .max(1000, 'Estimated hours seems too high')
    .default(0),
  
  assigned_to: uuidSchema,
})
  .refine(
    (data) => {
      // If both dates are provided, validate start_date is before due_date
      if (data.start_date && data.due_date) {
        return new Date(data.start_date) <= new Date(data.due_date)
      }
      return true
    },
    {
      message: 'Start date must be before or equal to due date',
      path: ['due_date'],
    }
  )

/**
 * Schema for updating an existing task
 */
export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must not exceed 255 characters')
    .trim()
    .optional(),
  
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .trim()
    .optional()
    .nullable(),
  
  status: z
    .enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'], {
      errorMap: () => ({ message: 'Invalid status' }),
    })
    .optional(),
  
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .nullable(),
  
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .nullable(),
  
  estimated_hours: z
    .number()
    .min(0, 'Estimated hours cannot be negative')
    .max(1000, 'Estimated hours seems too high')
    .optional(),
  
  assigned_to: uuidSchema.nullable(),
})
  .refine(
    (data) => {
      // If both dates are provided, validate start_date is before due_date
      if (data.start_date && data.due_date) {
        return new Date(data.start_date) <= new Date(data.due_date)
      }
      return true
    },
    {
      message: 'Start date must be before or equal to due date',
      path: ['due_date'],
    }
  )

// ============================================================================
// Type Exports
// ============================================================================

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates task form data and returns formatted errors
 */
export function validateTaskForm(
  data: unknown,
  isUpdate: boolean = false
): {
  success: boolean
  data?: CreateTaskInput | UpdateTaskInput
  errors?: Record<string, string>
} {
  const schema = isUpdate ? updateTaskSchema : createTaskSchema
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Format errors for easy display
  const errors: Record<string, string> = {}
  result.error.errors.forEach((error) => {
    const path = error.path.join('.')
    errors[path] = error.message
  })

  return { success: false, errors }
}

/**
 * Gets field-specific error message
 */
export function getTaskFieldError(
  errors: Record<string, string> | undefined,
  field: string
): string | undefined {
  return errors?.[field]
}

/**
 * Validates UUID format
 */
export function isValidUUID(value: string): boolean {
  if (!value) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

