import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Dynamic CORS (echo Origin when allowed) similar to /api/bookings
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const originOk = (o?: string | null) => !!o && (ALLOWED_ORIGINS.includes(o) || ALLOWED_ORIGINS.includes('*'))

const corsHeadersFor = (origin?: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
  if (originOk(origin) && origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  return headers
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: corsHeadersFor(request.headers.get('origin')),
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
      const res = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    // Resolve approver metadata (name and role) with resilient fallbacks
    let approverName: string | null = null
    let approverRole: string | null = null
    try {
      // Try v2 view first
      const { data: v2, error: v2Err } = await supabase
        .from('profiles_with_roles_v2')
        .select('full_name, primary_role')
        .eq('id', user.id)
        .maybeSingle()
      if (!v2Err && v2) {
        approverName = (v2 as any).full_name || null
        approverRole = (v2 as any).primary_role || null
      } else {
        // Fallback to v1 view
        const { data: v1, error: v1Err } = await supabase
          .from('profiles_with_roles')
          .select('full_name, role')
          .eq('id', user.id)
          .maybeSingle()
        if (!v1Err && v1) {
          approverName = (v1 as any).full_name || null
          approverRole = (v1 as any).role || null
        } else {
          // Fallback to raw profiles
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .maybeSingle()
          if (prof) {
            approverName = (prof as any).full_name || null
            approverRole = (prof as any).role || null
          }
        }
      }
    } catch {}
    if (!approverName) {
      approverName = (user.user_metadata as any)?.full_name || user.email || null
    }
    if (!approverRole) {
      approverRole = (user.user_metadata as any)?.role || null
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
      const res = NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    // Get booking details to check access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, provider_id, status')
      .eq('id', milestone.booking_id)
      .single()

    if (bookingError || !booking) {
      const res = NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id
    const isAdmin = user.user_metadata?.role === 'admin'

    // Only clients, providers, or admins can approve milestones
    if (!isClient && !isProvider && !isAdmin) {
      const res = NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    // Determine update behavior
    let updatedMilestone = milestone
    let performedUpdate = false

    // If already completed and action is approve, treat as idempotent and skip status update
    if (!(milestone.status === 'completed' && validatedData.action === 'approve')) {
      // If milestone is already completed and trying to reject, block
      if (milestone.status === 'completed' && validatedData.action === 'reject') {
        const res = NextResponse.json(
          { error: 'Milestone is already completed' },
          { status: 400 }
        )
        Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
        return res
      }

      // Update milestone status based on action
      // Note: milestone status doesn't have 'rejected', use 'cancelled' for rejected approvals
      const newStatus = validatedData.action === 'approve' ? 'completed' : 'cancelled'
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
        console.error('❌ Error updating milestone in approve endpoint:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          updateData,
          milestone_id: validatedData.milestone_id
        })
        const res = NextResponse.json(
          { error: 'Failed to update milestone', details: updateError.message, hint: updateError.hint },
          { status: 500 }
        )
        Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
        return res
      }
      updatedMilestone = data
      performedUpdate = true
    }

    // Create approval record
    // Align to table schema: user_id, status, comment, created_at default
    const status = validatedData.action === 'approve' ? 'approved' : 'rejected'
    const { data: createdApproval, error: approvalError } = await supabase
      .from('milestone_approvals')
      .insert({
        milestone_id: validatedData.milestone_id,
        booking_id: milestone.booking_id,
        user_id: user.id,
        status,
        comment: validatedData.feedback,
        approver_name: approverName,
        approver_role: approverRole
      })
      .select()
      .single()

    // Start with whatever was created
    let approval = createdApproval

    if (approvalError) {
      console.error('Error creating approval record:', approvalError)
      // Attempt to return the most recent approval for this milestone by this user
      try {
        const { data: existingApproval } = await supabase
          .from('milestone_approvals')
          .select('*')
          .eq('milestone_id', validatedData.milestone_id)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (existingApproval) approval = existingApproval
      } catch (e) {
        // best-effort fallback; keep approval as null
      }
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

    const okRes = NextResponse.json(
      { 
        milestone: updatedMilestone,
        approval: {
          ...approval,
          approver_name: approval?.approver_name ?? approverName,
          approver_role: approval?.approver_role ?? approverRole
        },
        message: `Milestone ${validatedData.action === 'approve' ? 'approved' : 'rejected'} successfully`
      },
      { status: 200 }
    )
    Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => okRes.headers.set(k, v))
    return okRes

  } catch (error) {
    if (error instanceof z.ZodError) {
      const res = NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    console.error('Approve milestone error:', error)
    const res = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
    Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }
}
