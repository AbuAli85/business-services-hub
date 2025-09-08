import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders })
}

async function authenticateUser(request: NextRequest) {
  let user: any = null
  let authError: any = null
  try {
    const supabase = await getSupabaseAdminClient()
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: { user: tokenUser }, error } = await supabase.auth.getUser(token)
      if (tokenUser && !error) {
        user = tokenUser
        return { user, authError }
      }
      authError = error
    }
    const cookieHeader = request.headers.get('cookie')
    if (!user && cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        ;(acc as any)[key] = value
        return acc
      }, {} as Record<string, string>)
      const accessToken = cookies['sb-access-token'] || cookies['supabase-auth-token']
      if (accessToken) {
        const { data: { user: cookieUser }, error } = await supabase.auth.getUser(accessToken)
        if (cookieUser && !error) {
          user = cookieUser
          return { user, authError }
        }
        authError = error
      }
    }
    if (!user) authError = new Error('Authentication required')
  } catch (e) {
    authError = e
  }
  return { user, authError }
}

async function checkAccess(bookingId: string, userId: string) {
  const supabase = await getSupabaseAdminClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id, client_id, provider_id')
    .eq('id', bookingId)
    .single()
  if (error || !booking) return { hasAccess: false }
  const isClient = booking.client_id === userId
  const isProvider = booking.provider_id === userId
  return { hasAccess: isClient || isProvider }
}

export async function GET(request: NextRequest, { params }: { params: { bookingId: string } }) {
  try {
    const { user, authError } = await authenticateUser(request)
    if (authError || !user) {
      const res = NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    const { bookingId } = params
    const { hasAccess } = await checkAccess(bookingId, user.id)
    if (!hasAccess) {
      const res = NextResponse.json({ error: 'Access denied' }, { status: 403 })
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    const supabase = await getSupabaseAdminClient()
    const { data: milestones, error: mErr } = await supabase
      .from('milestones')
      .select(`
        id, booking_id, title, description, progress_percentage, status, due_date, weight, order_index, editable, created_at, updated_at,
        tasks (id, milestone_id, title, description, status, progress_percentage, due_date, editable, estimated_hours, actual_hours, priority, created_at, updated_at, order_index)
      `)
      .eq('booking_id', bookingId)
      .order('order_index', { ascending: true })
    if (mErr) {
      const res = NextResponse.json({ error: mErr.message }, { status: 500 })
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    const res = NextResponse.json({ milestones: milestones || [] })
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  } catch (e: any) {
    const res = NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }
}


