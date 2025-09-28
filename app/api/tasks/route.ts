import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Validation schemas
const CreateTaskSchema = z.object({
  milestone_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  estimated_hours: z.number().min(0).default(0),
  assigned_to: z.string().uuid().optional(),
  risk_level: z.enum(['low', 'medium', 'high']).default('low'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).default('pending')
})

const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  progress_percentage: z.number().min(0).max(100).optional(),
  actual_hours: z.number().min(0).optional()
})

// GET /api/tasks - Get tasks for a milestone or booking
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('milestoneId')
    const bookingId = searchParams.get('bookingId')
    const taskId = searchParams.get('taskId')

    if (!milestoneId && !bookingId && !taskId) {
      return NextResponse.json(
        { error: 'milestoneId, bookingId, or taskId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    let query = supabase
      .from('tasks')
      .select(`
        id,
        milestone_id,
        title,
        description,
        due_date,
        status,
        priority,
        progress_percentage,
        estimated_hours,
        actual_hours,
        assigned_to,
        risk_level,
        created_at,
        updated_at,
        created_by,
        is_overdue,
        overdue_since,
        order_index,
        editable
      `)
      .order('order_index', { ascending: true })

    if (taskId) {
      query = query.eq('id', taskId)
    } else if (milestoneId) {
      query = query.eq('milestone_id', milestoneId)
    } else if (bookingId) {
      query = query.eq('milestones.booking_id', bookingId)
    }

    const { data: tasks, error } = await query

    if (error) {
      console.error('Error fetching tasks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Check if user has access to this booking
    if (tasks && tasks.length > 0) {
      const milestoneId = tasks[0].milestone_id
      
      // Get milestone to get booking ID
      const { data: milestone, error: milestoneError } = await supabase
        .from('milestones')
        .select('booking_id')
        .eq('id', milestoneId)
        .single()

      if (milestoneError || !milestone) {
        return NextResponse.json(
          { error: 'Milestone not found' },
          { status: 404, headers: corsHeaders }
        )
      }

      // Get booking details to check access
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('client_id, provider_id')
        .eq('id', milestone.booking_id)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404, headers: corsHeaders }
        )
      }

      const isClient = booking.client_id === user.id
      const isProvider = booking.provider_id === user.id
      const isAdmin = user.user_metadata?.role === 'admin'

      if (!isClient && !isProvider && !isAdmin) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403, headers: corsHeaders }
        )
      }
    }

    return NextResponse.json(
      { tasks: tasks || [] },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Tasks API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    const validatedData = CreateTaskSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if user has access to this milestone
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select(`
        id,
        booking_id,
        created_by
      `)
      .eq('id', validatedData.milestone_id)
      .single()

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get booking details to check access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, provider_id')
      .eq('id', milestone.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const isProvider = booking.provider_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'
    const isCreator = milestone.created_by === user.id

    if (!isProvider && !isAdmin && !isCreator) {
      return NextResponse.json(
        { error: 'Only providers can create tasks' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Create task
    const { data: task, error: createError } = await supabase
      .from('tasks')
      .insert({
        ...validatedData,
        created_by: user.id,
        progress_percentage: 0,
        actual_hours: 0,
        editable: true,
        is_overdue: false
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating task:', createError)
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Update milestone task counts
    await supabase.rpc('recalc_milestone_progress', {
      p_milestone_id: validatedData.milestone_id
    })

    return NextResponse.json(
      { task },
      { status: 201, headers: corsHeaders }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PATCH /api/tasks - Update a task
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')

    if (!taskId) {
      return NextResponse.json(
        { 
          error: 'MISSING_ID', 
          message: 'Query param "id" is required',
          code: 'MISSING_ID'
        },
        { status: 400, headers: corsHeaders }
      )
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: 'INVALID_JSON', 
          message: 'Body must be valid JSON',
          code: 'INVALID_JSON'
        },
        { status: 400, headers: corsHeaders }
      )
    }

    const validatedData = UpdateTaskSchema.safeParse(body)
    if (!validatedData.success) {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR', 
          message: 'Invalid input fields',
          details: validatedData.error.flatten(),
          code: 'VALIDATION_ERROR'
        },
        { status: 422, headers: corsHeaders }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { 
          error: 'UNAUTHORIZED', 
          message: 'Authentication required',
          code: 'UNAUTHORIZED'
        },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get task with current status for transition validation
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        milestone_id,
        status,
        created_by,
        assigned_to
      `)
      .eq('id', taskId)
      .single()

    if (taskError) {
      console.error('Error fetching task:', taskError)
      if (taskError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'TASK_NOT_FOUND', 
            message: 'Task not found',
            code: 'TASK_NOT_FOUND'
          },
          { status: 404, headers: corsHeaders }
        )
      }
      return NextResponse.json(
        { 
          error: 'FETCH_FAILED', 
          message: 'Failed to fetch task',
          details: taskError.message,
          code: 'FETCH_FAILED'
        },
        { status: 500, headers: corsHeaders }
      )
    }

    if (!task) {
      return NextResponse.json(
        { 
          error: 'TASK_NOT_FOUND', 
          message: 'Task not found',
          code: 'TASK_NOT_FOUND'
        },
        { status: 404, headers: corsHeaders }
      )
    }

    // Validate status transition if status is being changed
    if (validatedData.data.status && validatedData.data.status !== task.status) {
      // Client-side transition validation (fallback if RPC doesn't exist)
      const canTransition = (from: string, to: string) => {
        const allowed: Record<string, string[]> = {
          pending: ['in_progress', 'cancelled'],
          in_progress: ['on_hold', 'completed', 'cancelled'],
          on_hold: ['in_progress', 'cancelled'],
          completed: [],
          cancelled: [],
        }
        return allowed[from]?.includes(to) ?? false
      }

      if (!canTransition(task.status, validatedData.data.status)) {
        return NextResponse.json(
          { 
            error: 'INVALID_TRANSITION', 
            message: `Cannot transition from ${task.status} to ${validatedData.data.status}`,
            details: {
              current_status: task.status,
              attempted_status: validatedData.data.status,
              allowed_transitions: {
                pending: ['in_progress', 'cancelled'],
                in_progress: ['on_hold', 'completed', 'cancelled'],
                on_hold: ['in_progress', 'cancelled'],
                completed: [],
                cancelled: []
              }
            },
            code: 'INVALID_TRANSITION'
          },
          { status: 422, headers: corsHeaders }
        )
      }

      // Try RPC validation if available (optional)
      try {
        const { data: rpcCanTransition, error: transitionError } = await supabase
          .rpc('can_transition', {
            current_status: task.status,
            new_status: validatedData.data.status,
            entity_type: 'task'
          })

        if (transitionError) {
          console.warn('RPC transition check failed, using client-side validation:', transitionError)
        } else if (!rpcCanTransition) {
          return NextResponse.json(
            { 
              error: 'INVALID_TRANSITION', 
              message: `Cannot transition from ${task.status} to ${validatedData.data.status}`,
              code: 'INVALID_TRANSITION'
            },
            { status: 422, headers: corsHeaders }
          )
        }
      } catch (rpcError) {
        console.warn('RPC transition check not available, using client-side validation:', rpcError)
      }
    }

    // Get milestone to get booking ID
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select('booking_id')
      .eq('id', task.milestone_id)
      .single()

    if (milestoneError || !milestone) {
      console.error('Error fetching milestone:', milestoneError)
      return NextResponse.json(
        { 
          error: 'MILESTONE_NOT_FOUND', 
          message: 'Milestone not found',
          code: 'MILESTONE_NOT_FOUND'
        },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get booking details to check access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, provider_id')
      .eq('id', milestone.booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError)
      return NextResponse.json(
        { 
          error: 'BOOKING_NOT_FOUND', 
          message: 'Booking not found',
          code: 'BOOKING_NOT_FOUND'
        },
        { status: 404, headers: corsHeaders }
      )
    }

    const isProvider = booking.provider_id === user.id
    const isClient = booking.client_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'
    const isCreator = task.created_by === user.id
    const isAssigned = task.assigned_to === user.id

    // Providers, admins, creators, or assigned users can update tasks
    if (!isProvider && !isAdmin && !isCreator && !isAssigned) {
      return NextResponse.json(
        { 
          error: 'FORBIDDEN', 
          message: 'You do not have permission to modify this task',
          code: 'FORBIDDEN'
        },
        { status: 403, headers: corsHeaders }
      )
    }

    // Update task
    const updateData = {
      ...validatedData.data,
      updated_at: new Date().toISOString()
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating task:', updateError)
      
      // Map common database errors to user-friendly messages
      if (updateError.code === '42501') {
        return NextResponse.json(
          { 
            error: 'FORBIDDEN', 
            message: 'You do not have permission to modify this task',
            code: 'FORBIDDEN'
          },
          { status: 403, headers: corsHeaders }
        )
      }
      
      if (updateError.code === 'P0001' || /Invalid .*transition/i.test(updateError.message)) {
        return NextResponse.json(
          { 
            error: 'INVALID_TRANSITION', 
            message: 'Invalid status transition',
            details: updateError.message,
            code: 'INVALID_TRANSITION'
          },
          { status: 422, headers: corsHeaders }
        )
      }

      return NextResponse.json(
        { 
          error: 'UPDATE_FAILED', 
          message: 'Failed to update task',
          details: updateError.message,
          code: updateError.code || 'UPDATE_FAILED'
        },
        { status: 500, headers: corsHeaders }
      )
    }

    // Recalculate milestone progress using the new RPC function (optional)
    let milestoneProgress = null
    try {
      const { data: progressData, error: progressError } = await supabase
        .rpc('recalc_milestone_progress', {
          p_milestone_id: task.milestone_id
        })

      if (progressError) {
        console.warn('Error recalculating milestone progress (non-critical):', progressError)
      } else {
        milestoneProgress = progressData
      }
    } catch (rpcError) {
      console.warn('RPC recalc_milestone_progress not available (non-critical):', rpcError)
    }

    // Broadcast realtime update to booking channel (optional)
    try {
      await supabase.channel(`booking:${milestone.booking_id}`)
        .send({
          type: 'broadcast',
          event: 'task_updated',
          payload: {
            task: updatedTask,
            milestone_progress: milestoneProgress,
            booking_id: milestone.booking_id
          }
        })
    } catch (realtimeError) {
      console.warn('Error broadcasting realtime update (non-critical):', realtimeError)
    }

    return NextResponse.json(
      { 
        success: true,
        task: updatedTask,
        milestone_progress: milestoneProgress
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Update task error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'VALIDATION_ERROR', 
          message: 'Invalid input',
          details: error.flatten(),
          code: 'VALIDATION_ERROR'
        },
        { status: 400, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR', 
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE /api/tasks - Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get task and check access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        id,
        milestone_id,
        created_by
      `)
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get milestone to get booking ID
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select('booking_id')
      .eq('id', task.milestone_id)
      .single()

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Get booking details to check access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('provider_id')
      .eq('id', milestone.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const isProvider = booking.provider_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'
    const isCreator = task.created_by === user.id

    // Only providers, admins, or creators can delete tasks
    if (!isProvider && !isAdmin && !isCreator) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Delete task
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (deleteError) {
      console.error('Error deleting task:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete task' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Update milestone progress
    await supabase.rpc('recalc_milestone_progress', {
      p_milestone_id: task.milestone_id
    })

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
