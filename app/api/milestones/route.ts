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
const CreateMilestoneSchema = z.object({
  booking_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  due_date: z.string().optional(),
  weight: z.number().min(0.1).max(10).default(1.0)
})

const UpdateMilestoneSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
  due_date: z.string().optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  actual_hours: z.number().min(0).optional(),
  weight: z.number().min(0.1).max(10).optional()
})

// GET /api/milestones - Get milestones for a booking
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')
    const milestoneId = searchParams.get('milestoneId')

    if (!bookingId && !milestoneId) {
      return NextResponse.json(
        { error: 'bookingId or milestoneId is required' },
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
      .from('milestones')
      .select(`
        id,
        booking_id,
        title,
        description,
        due_date,
        status,
        progress_percentage,
        weight,
        estimated_hours,
        actual_hours,
        completed_at,
        created_at,
        updated_at,
        created_by,
        is_overdue,
        overdue_since,
        order_index,
        completed_tasks,
        total_tasks,
        editable,
        tasks (
          id,
          title,
          description,
          status,
          progress_percentage,
          due_date,
          estimated_hours,
          actual_hours,
          created_at,
          updated_at
        )
      `)
      .order('order_index', { ascending: true })

    if (milestoneId) {
      query = query.eq('id', milestoneId)
    } else {
      query = query.eq('booking_id', bookingId)
    }

    const { data: milestones, error } = await query

    if (error) {
      console.warn('Error fetching milestones:', error)
      // If it's a permission error, return empty array instead of failing
      if (error.code === '42501' || error.message.includes('permission denied')) {
        console.warn('Permission denied for milestones table, returning empty array')
        return NextResponse.json(
          { milestones: [] },
          { status: 200, headers: corsHeaders }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch milestones' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Check if user has access to this booking. If no milestones returned, validate using bookingId from query.
    const targetBookingId = milestones?.[0]?.booking_id || bookingId
    if (targetBookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('client_id, provider_id')
        .eq('id', targetBookingId)
        .single()

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404, headers: corsHeaders }
        )
      }

      // Check if user is client, provider, or admin
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
      { milestones: milestones || [] },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Milestones API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// POST /api/milestones - Create a new milestone
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    const validatedData = CreateMilestoneSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, provider_id, status')
      .eq('id', validatedData.booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    const isProvider = booking.provider_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'

    if (!isProvider && !isAdmin) {
      return NextResponse.json(
        { error: 'Only providers can create milestones' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Create milestone
    const { data: milestone, error: createError } = await supabase
      .from('milestones')
      .insert({
        ...validatedData,
        created_by: user.id,
        status: 'pending',
        progress_percentage: 0,
        actual_hours: 0,
        completed_tasks: 0,
        total_tasks: 0,
        editable: true,
        is_overdue: false
      })
      .select()
      .single()

    if (createError) {
      console.warn('Error creating milestone:', createError)
      // If it's a permission error, return a more specific error
      if (createError.code === '42501' || createError.message.includes('permission denied')) {
        console.warn('Permission denied for milestones table during creation')
        return NextResponse.json(
          { error: 'Permission denied: Unable to create milestone. Please check your database permissions.' },
          { status: 403, headers: corsHeaders }
        )
      }
      return NextResponse.json(
        { error: 'Failed to create milestone' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { milestone },
      { status: 201, headers: corsHeaders }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error('Create milestone error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// PATCH /api/milestones - Update a milestone
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('id')

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'milestoneId is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Validate input
    const validatedData = UpdateMilestoneSchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get milestone and check access
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select(`
        id,
        booking_id,
        created_by,
        status
      `)
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

    const isProvider = booking.provider_id === user.id
    const isClient = booking.client_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'
    const isCreator = milestone.created_by === user.id

    // Only providers, admins, or creators can update milestones
    if (!isProvider && !isAdmin && !isCreator) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Update milestone
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    // Set completed_at if status is being changed to completed
    if (validatedData.status === 'completed' && milestone.status !== 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    // Recalculate progress_percentage from tasks if not explicitly provided
    if (!validatedData.progress_percentage) {
      try {
        const { data: milestoneTasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('milestone_id', milestoneId)
        
        if (milestoneTasks) {
          const totalTasks = milestoneTasks.length
          const completedTasks = milestoneTasks.filter(t => t.status === 'completed').length
          const calculatedProgress = totalTasks > 0 
            ? Math.round((completedTasks / totalTasks) * 100) 
            : 0
          
          updateData.progress_percentage = calculatedProgress
          updateData.completed_tasks = completedTasks
          updateData.total_tasks = totalTasks
          console.log(`✅ Recalculated milestone progress: ${calculatedProgress}% (${completedTasks}/${totalTasks} tasks)`)
        }
      } catch (progressError) {
        console.warn('⚠️ Could not recalculate milestone progress:', progressError)
      }
    }

    const { data: updatedMilestone, error: updateError } = await supabase
      .from('milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating milestone:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        updateData,
        milestoneId
      })
      // If it's a permission error, return a more specific error
      if (updateError.code === '42501' || updateError.message.includes('permission denied')) {
        console.warn('Permission denied for milestones table during update')
        return NextResponse.json(
          { error: 'Permission denied: Unable to update milestone. Please check your database permissions.' },
          { status: 403, headers: corsHeaders }
        )
      }
      return NextResponse.json(
        { error: 'Failed to update milestone', details: updateError.message, hint: updateError.hint },
        { status: 500, headers: corsHeaders }
      )
    }

    // Trigger booking progress recalculation cascade
    try {
      // Add timeout protection for RPC call
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000) // 3 second timeout
      
      const { error: bookingProgressError } = await supabase
        .rpc('calculate_booking_progress', {
          booking_id: milestone.booking_id
        }).abortSignal(controller.signal)
      
      clearTimeout(timeout)

      if (bookingProgressError) {
        console.warn('⚠️ RPC calculate_booking_progress failed, using fallback:', bookingProgressError)
        
        // Handle stack depth errors specifically
        if (bookingProgressError.code === '54001') {
          console.warn('⏰ Stack depth limit exceeded in calculate_booking_progress, skipping RPC call')
        }
        
        // Fallback: Direct calculation
        const { data: bookingMilestonesData } = await supabase
          .from('milestones')
          .select('progress_percentage, weight')
          .eq('booking_id', milestone.booking_id)

        if (bookingMilestonesData) {
          const totalWeight = bookingMilestonesData.reduce((sum, m) => sum + (m.weight || 1), 0)
          const weightedProgress = bookingMilestonesData.reduce(
            (sum, m) => sum + ((m.progress_percentage || 0) * (m.weight || 1)),
            0
          )
          const bookingProgress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0

          await supabase
            .from('bookings')
            .update({ 
              progress_percentage: bookingProgress,
              updated_at: new Date().toISOString()
            })
            .eq('id', milestone.booking_id)

          console.log(`✅ Booking progress updated after milestone change: ${bookingProgress}%`)
        }
      } else {
        console.log('✅ Booking progress updated via RPC after milestone change')
      }
    } catch (bookingCascadeError) {
      console.warn('⚠️ Booking cascade update failed (non-critical):', bookingCascadeError)
    }

    return NextResponse.json(
      { milestone: updatedMilestone },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error('Update milestone error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// DELETE /api/milestones - Delete a milestone
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const milestoneId = searchParams.get('id')

    if (!milestoneId) {
      return NextResponse.json(
        { error: 'milestoneId is required' },
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

    // Get milestone and check access
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select(`
        id,
        created_by,
        booking_id
      `)
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
    const isCreator = milestone.created_by === user.id

    // Only providers, admins, or creators can delete milestones
    if (!isProvider && !isAdmin && !isCreator) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Delete milestone (cascade will handle tasks)
    const { error: deleteError } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId)

    if (deleteError) {
      console.warn('Error deleting milestone:', deleteError)
      // If it's a permission error, return a more specific error
      if (deleteError.code === '42501' || deleteError.message.includes('permission denied')) {
        console.warn('Permission denied for milestones table during deletion')
        return NextResponse.json(
          { error: 'Permission denied: Unable to delete milestone. Please check your database permissions.' },
          { status: 403, headers: corsHeaders }
        )
      }
      return NextResponse.json(
        { error: 'Failed to delete milestone' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { message: 'Milestone deleted successfully' },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    console.error('Delete milestone error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
