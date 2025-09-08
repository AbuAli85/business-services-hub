'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()
    const supabase = await getSupabaseClient()

    // Fetch auth users (service role)
    const { data: authList, error: authError } = await admin.auth.admin.listUsers()
    if (authError) {
      return NextResponse.json({ error: 'Failed to list auth users', details: authError.message }, { status: 500 })
    }

    const authUsers = authList?.users || []
    const ids = authUsers.map(u => u.id)

    // Fetch profiles for those ids
    let profiles: any[] = []
    if (ids.length) {
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone, company_name, status, created_at')
        .in('id', ids)
      if (pErr) {
        return NextResponse.json({ error: 'Failed to fetch profiles', details: pErr.message }, { status: 500 })
      }
      profiles = p || []
    }

    const profileById = new Map(profiles.map(p => [p.id, p]))

    const merged = authUsers.map(u => {
      const prof = profileById.get(u.id) || {}
      return {
        id: u.id,
        email: u.email,
        full_name: prof.full_name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
        role: prof.role || u.user_metadata?.role || 'client',
        phone: prof.phone || null,
        company_name: prof.company_name || null,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        status: prof.status || 'active',
        is_verified: !!u.email_confirmed_at,
        two_factor_enabled: !!u.phone_confirmed_at // placeholder
      }
    })

    return NextResponse.json({ users: merged })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', details: e?.message || String(e) }, { status: 500 })
  }
}


