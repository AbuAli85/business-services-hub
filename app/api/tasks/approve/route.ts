import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Dynamic CORS echoing Origin for credentialed requests
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

const ApproveTaskSchema = z.object({
  task_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  notes: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validated = ApproveTaskSchema.parse(body)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      const res = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    // Load task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, milestone_id, approval_status')
      .eq('id', validated.task_id)
      .single()

    if (taskError || !task) {
      const res = NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    // Load milestone to get booking_id
    const { data: milestone, error: milestoneError } = await supabase
      .from('milestones')
      .select('id, booking_id')
      .eq('id', task.milestone_id)
      .single()

    if (milestoneError || !milestone) {
      const res = NextResponse.json(
        { error: 'Related milestone not found' },
        { status: 404 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const bookingId = milestone.booking_id
    if (!bookingId) {
      const res = NextResponse.json(
        { error: 'Related booking not found' },
        { status: 404 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, provider_id')
      .eq('id', bookingId)
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

    if (!isClient && !isProvider && !isAdmin) {
      const res = NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    const approvalStatus = validated.action === 'approve' ? 'approved' : 'rejected'

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        approval_status: approvalStatus,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        approval_notes: validated.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', validated.task_id)
      .select()
      .single()

    if (updateError) {
      const res = NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
      Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }

    // Optionally recalc milestone progress
    try {
      await supabase.rpc('recalc_milestone_progress', { p_milestone_id: task.milestone_id })
    } catch (e) {
      // non-fatal
    }

    const okRes = NextResponse.json({ task: updatedTask }, { status: 200 })
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
    const res = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
    Object.entries(corsHeadersFor(request.headers.get('origin'))).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }
}


