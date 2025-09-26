import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

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
  due_date: z.string().datetime().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  estimated_hours: z.number().min(0).default(0),
  weight: z.number().min(0.1).max(10).default(1.0),
  phase_id: z.string().uuid().optional()
})

const UpdateMilestoneSchema = CreateMilestoneSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
  progress_percentage: z.number().min(0).max(100).optional(),
  actual_hours: z.number().min(0).optional()
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
        priority,
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
          priority,
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
      console.error('Error fetching milestones:', error)
      return NextResponse.json(
        { error: 'Failed to fetch milestones' },
        { status: 500, headers: corsHeaders }
      )
    }

    // Check if user has access to this booking
    if (milestones && milestones.length > 0) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('client_id, provider_id')
        .eq('id', milestones[0].booking_id)
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
      console.error('Error creating milestone:', createError)
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

    const { data: updatedMilestone, error: updateError } = await supabase
      .from('milestones')
      .update(updateData)
      .eq('id', milestoneId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating milestone:', updateError)
      return NextResponse.json(
        { error: 'Failed to update milestone' },
        { status: 500, headers: corsHeaders }
      )
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
      console.error('Error deleting milestone:', deleteError)
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
