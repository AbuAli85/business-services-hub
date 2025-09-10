import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userIdParam = params.id
    if (!userIdParam) return NextResponse.json({ error: 'Missing user id' }, { status: 400 })

    const admin = getSupabaseAdminClient()
    const supabase = await getSupabaseClient()

    // Auth via Bearer token and admin role
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tokenUser, error: tokenErr } = await admin.auth.getUser(token)
    if (tokenErr || !tokenUser?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const callerId = tokenUser.user.id
    const metaRole = (tokenUser.user.user_metadata as any)?.role
    if (metaRole !== 'admin') {
      const { data: me } = await supabase.from('profiles').select('role').eq('id', callerId).single()
      if ((me?.role || 'client') !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { role, status } = body || {}
    if (!role && !status) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    // Update profiles
    const update: any = {}
    if (role) update.role = role
    if (status) update.status = status
    const { error: profErr } = await supabase.from('profiles').update(update).eq('id', userIdParam)
    if (profErr) return NextResponse.json({ error: 'Failed to update profile', details: profErr.message }, { status: 500 })

    // Sync user_roles to match role
    if (role) {
      // Ensure single row per user; upsert with unique user_id index
      const { error: delErr } = await supabase.from('user_roles').delete().eq('user_id', userIdParam)
      if (delErr && !delErr.message?.includes('relation')) {
        return NextResponse.json({ error: 'Failed to sync roles', details: delErr.message }, { status: 500 })
      }
      const { error: insErr } = await supabase.from('user_roles').insert({ user_id: userIdParam, role })
      if (insErr) return NextResponse.json({ error: 'Failed to set role', details: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


