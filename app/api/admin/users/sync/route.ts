import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()

    // Authenticate admin via Bearer token
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tokenUser, error: tokenErr } = await admin.auth.getUser(token)
    if (tokenErr || !tokenUser?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const metaRole = (tokenUser.user.user_metadata as any)?.role
    if (metaRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch auth users (up to 1000)
    const { data: authList, error: listErr } = await (admin.auth.admin.listUsers({ page: 1, perPage: 1000 }) as any)
    if (listErr) return NextResponse.json({ error: 'Auth list failed', details: listErr.message }, { status: 500 })
    const authUsers = authList?.users || []

    // Fetch existing profiles ids
    const { data: existingProfiles, error: profErr } = await admin
      .from('profiles')
      .select('id, email, role, status')
    if (profErr) return NextResponse.json({ error: 'Profiles fetch failed', details: profErr.message }, { status: 500 })
    const idToProfile = new Map(existingProfiles?.map((p: any) => [p.id, p]))

    // Prepare mutations
    const toInsertProfiles: any[] = []
    const toUpdateProfiles: any[] = []
    const toReplaceUserRoles: any[] = []

    for (const u of authUsers) {
      const uid = u.id as string
      const email = (u.email as string) || null
      const meta = (u.user_metadata || {}) as any
      const role = (meta.role as string) || 'client'
      const status = (meta.status as string) || 'pending'
      const fullName = (meta.full_name as string) || null

      const prof = idToProfile.get(uid)
      if (!prof) {
        toInsertProfiles.push({ id: uid, email, role, status, full_name: fullName })
      } else {
        const upd: any = { }
        let needs = false
        if (!prof.email && email) { upd.email = email; needs = true }
        if (prof.role !== role) { upd.role = role; needs = true }
        if (!prof.status || prof.status !== status) { upd.status = status; needs = true }
        if (fullName && prof.full_name !== fullName) { upd.full_name = fullName; needs = true }
        if (needs) { upd.id = uid; toUpdateProfiles.push(upd) }
      }
      toReplaceUserRoles.push({ user_id: uid, role })
    }

    // Execute mutations
    if (toInsertProfiles.length) {
      const { error } = await admin.from('profiles').insert(toInsertProfiles)
      if (error) return NextResponse.json({ error: 'Insert profiles failed', details: error.message }, { status: 500 })
    }
    if (toUpdateProfiles.length) {
      // Update one-by-one to avoid upsert conflicts
      for (const upd of toUpdateProfiles) {
        const { id, ...fields } = upd
        const { error } = await admin.from('profiles').update(fields).eq('id', id)
        if (error) return NextResponse.json({ error: 'Update profile failed', details: error.message, id }, { status: 500 })
      }
    }

    // Sync user_roles: delete existing then insert new for deduplication
    for (const r of toReplaceUserRoles) {
      const { error: delErr } = await admin.from('user_roles').delete().eq('user_id', r.user_id)
      if (delErr && !delErr.message?.includes('relation')) {
        return NextResponse.json({ error: 'Delete user_roles failed', details: delErr.message, id: r.user_id }, { status: 500 })
      }
      const { error: insErr } = await admin.from('user_roles').insert(r)
      if (insErr) return NextResponse.json({ error: 'Insert user_roles failed', details: insErr.message, id: r.user_id }, { status: 500 })
    }

    return NextResponse.json({ success: true, inserted: toInsertProfiles.length, updated: toUpdateProfiles.length, roles_synced: toReplaceUserRoles.length })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


