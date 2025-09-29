import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

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

const RequestApprovalSchema = z.object({
  milestone_id: z.string().uuid(),
  comment: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validated = RequestApprovalSchema.parse(body)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Ensure milestone exists and user has access via booking
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select('id, booking_id')
      .eq('id', validated.milestone_id)
      .single()

    if (milestoneError || !milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404, headers: corsHeaders }
      )
    }

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

    const { data: approval, error: approvalError } = await supabase
      .from('milestone_approvals')
      .insert({
        milestone_id: validated.milestone_id,
        user_id: user.id,
        status: 'pending',
        comment: validated.comment
      })
      .select()
      .single()

    if (approvalError) {
      return NextResponse.json(
        { error: 'Failed to create approval request' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({ approval }, { status: 200, headers: corsHeaders })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}


