import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, status, role } = body || {}
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()
    const supabase = await getSupabaseClient()

    // Require admin via Bearer token (works from client fetch)
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tokenUser, error: tokenErr } = await admin.auth.getUser(token)
    if (tokenErr || !tokenUser?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = tokenUser.user.id
    const metaRole = (tokenUser.user.user_metadata as any)?.role
    if (metaRole !== 'admin') {
      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if ((me?.role || 'client') !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update profile status/role if provided
    if (status !== undefined || role !== undefined) {
      const update: any = {}
      if (status !== undefined) update.status = status
      if (role !== undefined) update.role = role

      const { error: profErr } = await admin
        .from('profiles')
        .update(update)
        .eq('id', user_id)

      if (profErr) {
        return NextResponse.json({ error: 'Failed to update profile', details: profErr.message }, { status: 400 })
      }

      if (role !== undefined) {
        // Upsert user_roles on unique user_id
        const { error: roleErr } = await admin
          .from('user_roles')
          .upsert({ user_id, role }, { onConflict: 'user_id' })

        if (roleErr && !roleErr.message?.includes('relation') ) {
          return NextResponse.json({ error: 'Failed to upsert user role', details: roleErr.message }, { status: 400 })
        }
      }
    }

    // Optionally mark email confirmed
    if (body.verify_email === true) {
      try {
        await admin.auth.admin.updateUserById(user_id, { email_confirm: true as any })
      } catch (e: any) {
        // non-fatal
        console.warn('Email verify update failed:', e?.message || e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Admin user-update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


