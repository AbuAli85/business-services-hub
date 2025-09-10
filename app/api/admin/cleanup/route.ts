import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

type CleanupBody = {
  deleteTestNotifications?: boolean
  markOldNotificationsReadDays?: number
  deleteProfileIds?: string[]
}

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()

    // Auth guard (admin only)
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tokenUser, error: tokenErr } = await admin.auth.getUser(token)
    if (tokenErr || !tokenUser?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const metaRole = (tokenUser.user.user_metadata as any)?.role
    if (metaRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = (await req.json()) as CleanupBody
    const actions: Record<string, any> = {}

    // 1) Delete obvious test notifications
    if (body.deleteTestNotifications) {
      const { error } = await admin
        .from('notifications')
        .delete()
        .or(
          [
            `type.in.(test,rls_test)`,
            `title.ilike.%test%`,
            `message.ilike.%test%`,
          ].join(',')
        )
      if (error) return NextResponse.json({ error: 'Failed deleting test notifications', details: error.message }, { status: 500 })
      actions.deletedTestNotifications = true
    }

    // 2) Mark old notifications as read (soft cleanup)
    if (typeof body.markOldNotificationsReadDays === 'number' && body.markOldNotificationsReadDays > 0) {
      const days = body.markOldNotificationsReadDays
      const { error } = await admin
        .from('notifications')
        .update({ is_read: true, read: true })
        .lt('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      if (error) return NextResponse.json({ error: 'Failed marking notifications read', details: error.message }, { status: 500 })
      actions.markedOldReadDays = days
    }

    // 3) Delete unwanted profiles by explicit id list (safe path)
    if (Array.isArray(body.deleteProfileIds) && body.deleteProfileIds.length) {
      const ids = body.deleteProfileIds

      // Remove dependent user_roles first
      const { error: urErr } = await admin.from('user_roles').delete().in('user_id', ids)
      if (urErr && !urErr.message?.includes('relation')) {
        return NextResponse.json({ error: 'Failed deleting user_roles', details: urErr.message }, { status: 500 })
      }

      // Delete profiles
      const { error: profErr } = await admin.from('profiles').delete().in('id', ids)
      if (profErr) return NextResponse.json({ error: 'Failed deleting profiles', details: profErr.message }, { status: 500 })

      // Try delete from auth
      for (const id of ids) {
        try { await admin.auth.admin.deleteUser(id) } catch {}
      }

      actions.deletedProfiles = ids.length
    }

    return NextResponse.json({ success: true, actions })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


