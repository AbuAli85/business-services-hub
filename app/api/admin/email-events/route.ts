import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()
    const supabase = await getSupabaseClient()

    // Auth via Bearer token
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tokenUser, error: tokenErr } = await admin.auth.getUser(token)
    if (tokenErr || !tokenUser?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = tokenUser.user.id
    const { data: me } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if ((me?.role || 'client') !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(req.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)

    const { data, error } = await supabase
      .from('email_notification_logs')
      .select('id, email, notification_type, status, provider, provider_message_id, sent_at, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ events: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


