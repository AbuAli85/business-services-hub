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
    await supabase.rpc('update_milestone_progress', {
      milestone_uuid: validatedData.milestone_id
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
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('id')

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate input
    const validatedData = UpdateTaskSchema.parse(body)

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
        created_by,
        assigned_to
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
    const isClient = booking.client_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'
    const isCreator = task.created_by === user.id
    const isAssigned = task.assigned_to === user.id

    // Providers, admins, creators, or assigned users can update tasks
    if (!isProvider && !isAdmin && !isCreator && !isAssigned) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Update task
    const updateData = {
      ...validatedData,
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
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Update milestone progress
    await supabase.rpc('update_milestone_progress', {
      milestone_uuid: task.milestone_id
    })

    return NextResponse.json(
      { task: updatedTask },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error('Update task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
    await supabase.rpc('update_milestone_progress', {
      milestone_uuid: task.milestone_id
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
