import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  })
}

// Validation schema
const ApproveMilestoneSchema = z.object({
  milestone_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  feedback: z.string().optional()
})

// POST /api/milestones/approve - Approve or reject a milestone
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    const validatedData = ApproveMilestoneSchema.parse(body)

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
        title,
        status,
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
      .select('client_id, provider_id, status')
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

    // Only clients, providers, or admins can approve milestones
    if (!isClient && !isProvider && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Determine update behavior
    let updatedMilestone = milestone
    let performedUpdate = false

    // If already completed and action is approve, treat as idempotent and skip status update
    if (!(milestone.status === 'completed' && validatedData.action === 'approve')) {
      // If milestone is already completed and trying to reject, block
      if (milestone.status === 'completed' && validatedData.action === 'reject') {
        return NextResponse.json(
          { error: 'Milestone is already completed' },
          { status: 400, headers: corsHeaders }
        )
      }

      // Update milestone status based on action
      const newStatus = validatedData.action === 'approve' ? 'completed' : 'rejected'
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Set completed_at if approving
      if (validatedData.action === 'approve') {
        updateData.completed_at = new Date().toISOString()
      }

      const { data, error: updateError } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', validatedData.milestone_id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating milestone:', updateError)
        return NextResponse.json(
          { error: 'Failed to update milestone' },
          { status: 500, headers: corsHeaders }
        )
      }
      updatedMilestone = data
      performedUpdate = true
    }

    // Create approval record
    // Align to table schema: user_id, status, comment, created_at default
    const status = validatedData.action === 'approve' ? 'approved' : 'rejected'
    const { data: approval, error: approvalError } = await supabase
      .from('milestone_approvals')
      .insert({
        milestone_id: validatedData.milestone_id,
        user_id: user.id,
        status,
        comment: validatedData.feedback
      })
      .select()
      .single()

    if (approvalError) {
      console.error('Error creating approval record:', approvalError)
      // Don't fail the request if approval record creation fails
    }

    // Trigger milestone progress recalculation only if we updated
    if (performedUpdate) {
      try {
        const { error: recalcError } = await supabase.rpc('recalc_milestone_progress', {
          p_milestone_id: validatedData.milestone_id
        })
        
        if (recalcError) {
          console.error('Error recalculating milestone progress:', recalcError)
        }
      } catch (recalcError) {
        console.error('Error calling recalc_milestone_progress:', recalcError)
      }
    }

    // Broadcast realtime update
    try {
      await supabase.channel(`booking:${milestone.booking_id}`)
        .send({
          type: 'broadcast',
          event: 'milestone_approved',
          payload: {
            milestone_id: validatedData.milestone_id,
            action: validatedData.action,
            status: validatedData.action === 'approve' ? 'completed' : 'rejected',
            approved_by: user.id,
            feedback: validatedData.feedback
          }
        })
    } catch (realtimeError) {
      console.error('Error broadcasting realtime update:', realtimeError)
    }

    return NextResponse.json(
      { 
        milestone: updatedMilestone,
        approval: approval,
        message: `Milestone ${validatedData.action === 'approve' ? 'approved' : 'rejected'} successfully`
      },
      { status: 200, headers: corsHeaders }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error('Approve milestone error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
