import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, status, role } = body || {}
    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const admin = getSupabaseAdminClient()
    const supabase = await getSupabaseClient()

    // Update profile status/role if provided
    if (status !== undefined || role !== undefined) {
      const update: any = {}
      if (status !== undefined) update.status = status
      if (role !== undefined) update.role = role

      const { error: profErr } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', user_id)

      if (profErr) {
        return NextResponse.json({ error: 'Failed to update profile', details: profErr.message }, { status: 400 })
      }

      if (role !== undefined) {
        // Upsert user_roles if table exists
        const { error: roleErr } = await supabase
          .from('user_roles')
          .upsert({ user_id, role })

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


