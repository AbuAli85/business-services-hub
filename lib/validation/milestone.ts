/**
 * Zod validation schemas for Milestone forms
 * Provides type-safe validation with helpful error messages
 */

import { z } from 'zod'

// ============================================================================
// Milestone Validation Schemas
// ============================================================================

/**
 * Schema for creating a new milestone
 */
export const createMilestoneSchema = z.object({
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
    .max(10000, 'Estimated hours seems too high')
    .default(0),
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
 * Schema for updating an existing milestone
 */
export const updateMilestoneSchema = z.object({
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
  
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)')
    .optional()
    .nullable(),
  
  progress_percentage: z
    .number()
    .min(0, 'Progress cannot be negative')
    .max(100, 'Progress cannot exceed 100%')
    .optional(),
  
  weight: z
    .number()
    .min(0.1, 'Weight must be at least 0.1')
    .max(10, 'Weight cannot exceed 10')
    .optional(),
})

// ============================================================================
// Type Exports
// ============================================================================

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates milestone form data and returns formatted errors
 */
export function validateMilestoneForm(
  data: unknown,
  isUpdate: boolean = false
): {
  success: boolean
  data?: CreateMilestoneInput | UpdateMilestoneInput
  errors?: Record<string, string>
} {
  const schema = isUpdate ? updateMilestoneSchema : createMilestoneSchema
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
export function getMilestoneFieldError(
  errors: Record<string, string> | undefined,
  field: string
): string | undefined {
  return errors?.[field]
}

