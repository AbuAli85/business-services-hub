import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, authError } = await authenticateUser(request)
    if (authError || !user) {
      const res = NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    const bookingId = params.id
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, authError } = await authenticateUser(request)
    if (authError || !user) {
      const res = NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    const bookingId = params.id
    const { hasAccess } = await checkAccess(bookingId, user.id)
    if (!hasAccess) {
      const res = NextResponse.json({ error: 'Access denied' }, { status: 403 })
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    
    const body = await request.json()
    const { title, description, start_date, due_date, priority, estimated_hours, risk_level, phase_id, template_id } = body
    
    if (!title || !due_date) {
      const res = NextResponse.json({ error: 'Title and due date are required' }, { status: 400 })
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    
    const supabase = await getSupabaseAdminClient()
    
    // Get the next order index
    const { data: existingMilestones } = await supabase
      .from('milestones')
      .select('order_index')
      .eq('booking_id', bookingId)
      .order('order_index', { ascending: false })
      .limit(1)
    
    const nextOrderIndex = existingMilestones && existingMilestones.length > 0 
      ? (existingMilestones[0].order_index || 0) + 1 
      : 0
    
    const { data: milestone, error: mErr } = await supabase
      .from('milestones')
      .insert({
        booking_id: bookingId,
        title,
        description: description || '',
        status: 'pending',
        priority: priority || 'medium',
        start_date: start_date || new Date().toISOString().split('T')[0],
        due_date,
        estimated_hours: estimated_hours || 0,
        actual_hours: 0,
        progress_percentage: 0,
        critical_path: false,
        risk_level: risk_level || 'low',
        phase_id: phase_id || null,
        template_id: template_id || null,
        order_index: nextOrderIndex,
        editable: true,
        weight: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (mErr) {
      console.error('Milestone creation error:', mErr)
      const res = NextResponse.json({ error: mErr.message }, { status: 500 })
      Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
      return res
    }
    
    const res = NextResponse.json({ milestone })
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  } catch (e: any) {
    console.error('Milestone creation error:', e)
    const res = NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }
}


