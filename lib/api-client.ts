/**
 * Centralized API Client for all backend communication
 * Provides consistent error handling, authentication, and type safety
 */

// ============================================================================
// Types
// ============================================================================

export interface ApiRequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | null | undefined>
  requiresAuth?: boolean
}

export interface ApiError {
  error: string
  details?: string
  hint?: string
  code?: string
}

export class ApiRequestError extends Error {
  public statusCode: number
  public details?: string
  public hint?: string
  public code?: string

  constructor(message: string, statusCode: number, apiError?: ApiError) {
    super(message)
    this.name = 'ApiRequestError'
    this.statusCode = statusCode
    this.details = apiError?.details
    this.hint = apiError?.hint
    this.code = apiError?.code
  }
}

// ============================================================================
// Core API Request Function
// ============================================================================

/**
 * Makes an authenticated API request with automatic error handling
 * @param path - API endpoint path (e.g., '/api/milestones')
 * @param options - Request options including method, body, params
 * @returns Parsed JSON response
 * @throws ApiRequestError with detailed error information
 */
export async function apiRequest<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { params, requiresAuth = true, ...fetchOptions } = options

  // Build URL with query parameters
  let url = path
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString
    }
  }

  // Default headers
  const headers = new Headers(fetchOptions.headers)
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json')
  }

  // Make request with credentials
  const response = await fetch(url, {
    credentials: requiresAuth ? 'include' : 'same-origin',
    ...fetchOptions,
    headers,
  })

  // Parse response
  let data: any
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    data = await response.json()
  } else {
    data = { error: await response.text() }
  }

  // Handle errors
  if (!response.ok) {
    const errorMessage = data.error || data.message || response.statusText
    throw new ApiRequestError(errorMessage, response.status, data)
  }

  return data as T
}

// ============================================================================
// HTTP Method Helpers
// ============================================================================

export const api = {
  /**
   * GET request
   */
  get: <T = any>(path: string, options?: ApiRequestOptions): Promise<T> => {
    return apiRequest<T>(path, { ...options, method: 'GET' })
  },

  /**
   * POST request
   */
  post: <T = any>(
    path: string,
    body?: any,
    options?: ApiRequestOptions
  ): Promise<T> => {
    return apiRequest<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * PATCH request
   */
  patch: <T = any>(
    path: string,
    body?: any,
    options?: ApiRequestOptions
  ): Promise<T> => {
    return apiRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * PUT request
   */
  put: <T = any>(
    path: string,
    body?: any,
    options?: ApiRequestOptions
  ): Promise<T> => {
    return apiRequest<T>(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * DELETE request
   */
  delete: <T = any>(path: string, options?: ApiRequestOptions): Promise<T> => {
    return apiRequest<T>(path, { ...options, method: 'DELETE' })
  },
}

// ============================================================================
// Error Handler Utility
// ============================================================================

export interface ErrorHandlerOptions {
  showToast?: boolean
  logToConsole?: boolean
  fallbackMessage?: string
}

/**
 * Centralized error handler for API errors
 * @param error - Error object from API request
 * @param options - Handler options
 * @returns Formatted error message
 */
export function handleApiError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): string {
  const {
    showToast = true,
    logToConsole = true,
    fallbackMessage = 'An unexpected error occurred',
  } = options

  let errorMessage = fallbackMessage
  let errorDetails: any = {}

  if (error instanceof ApiRequestError) {
    errorMessage = error.message
    errorDetails = {
      statusCode: error.statusCode,
      details: error.details,
      hint: error.hint,
      code: error.code,
    }
  } else if (error instanceof Error) {
    errorMessage = error.message
  }

  // Log to console if enabled
  if (logToConsole) {
    console.error('❌ API Error:', errorMessage, errorDetails)
  }

  // Show toast notification if enabled
  if (showToast && typeof window !== 'undefined') {
    // Dynamic import to avoid SSR issues
    import('sonner').then(({ toast }) => {
      if (errorDetails.hint) {
        toast.error(errorMessage, {
          description: errorDetails.hint,
        })
      } else {
        toast.error(errorMessage)
      }
    })
  }

  return errorMessage
}

// ============================================================================
// Specialized API Clients
// ============================================================================

/**
 * Milestones API Client
 */
export const milestonesApi = {
  /**
   * Get all milestones for a booking
   */
  getAll: (bookingId: string) =>
    api.get('/api/milestones', { params: { bookingId } }),

  /**
   * Get a single milestone by ID
   */
  getById: (milestoneId: string) =>
    api.get('/api/milestones', { params: { milestoneId } }),

  /**
   * Create a new milestone
   */
  create: (data: {
    booking_id: string
    title: string
    description?: string
    due_date?: string
    estimated_hours?: number
    weight?: number
  }) => api.post('/api/milestones', data),

  /**
   * Update a milestone
   */
  update: (
    milestoneId: string,
    data: {
      title?: string
      description?: string
      status?: string
      due_date?: string | null
      progress_percentage?: number
      actual_hours?: number
      weight?: number
    }
  ) => api.patch(`/api/milestones`, data, { params: { id: milestoneId } }),

  /**
   * Delete a milestone
   */
  delete: (milestoneId: string) =>
    api.delete('/api/milestones', { params: { id: milestoneId } }),

  /**
   * Approve or reject a milestone
   */
  approve: (data: {
    milestone_id: string
    action: 'approve' | 'reject'
    feedback?: string
  }) => api.post('/api/milestones/approve', data),

  /**
   * Add comment to a milestone
   */
  addComment: (data: {
    milestone_id: string
    content: string
    comment_type?: string
  }) => api.post('/api/milestones/comments', data),

  /**
   * Seed recommended milestones
   */
  seed: (bookingId: string, plan?: string) =>
    api.post('/api/milestones/seed', {
      booking_id: bookingId,
      plan: plan || 'content_creation',
    }),
}

/**
 * Tasks API Client
 */
export const tasksApi = {
  /**
   * Create a new task
   */
  create: (data: {
    milestone_id: string
    title: string
    description?: string
    status?: string
    start_date?: string | null
    due_date?: string | null
    estimated_hours?: number
    actual_hours?: number
    progress_percentage?: number
    assigned_to?: string | null
  }) => api.post('/api/tasks', data),

  /**
   * Update a task
   */
  update: (
    taskId: string,
    data: {
      title?: string
      description?: string
      status?: string
      start_date?: string | null
      due_date?: string | null
      estimated_hours?: number
      assigned_to?: string | null
    }
  ) => api.patch('/api/tasks', data, { params: { id: taskId } }),

  /**
   * Delete a task
   */
  delete: (taskId: string) =>
    api.delete('/api/tasks', { params: { id: taskId } }),
}

/**
 * Progress API Client
 */
export const progressApi = {
  /**
   * Get progress data for a booking
   */
  get: (bookingId: string) =>
    api.get('/api/progress', { params: { booking_id: bookingId } }),
}

