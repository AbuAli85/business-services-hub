'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    // Initialize clients with explicit error handling for env misconfig
    let admin
    try {
      admin = getSupabaseAdminClient()
    } catch (clientErr: any) {
      console.error('❌ Admin client initialization failed:', clientErr)
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Supabase admin client could not be initialized.'
      }, { status: 500 })
    }

    const supabase = await getSupabaseClient()

    // Require authenticated admin via Bearer token (works in API route)
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

    // Fetch auth users (service role)
    const { data: authList, error: authError } = await admin.auth.admin.listUsers()
    if (authError) {
      // Log full error server-side for diagnostics
      console.error('❌ listUsers failed:', {
        message: authError.message,
        name: (authError as any)?.name,
        status: (authError as any)?.status,
        code: (authError as any)?.code
      })
      const clientMessage = authError.message?.includes('Database error')
        ? 'Auth database unavailable'
        : 'Failed to list auth users'
      return NextResponse.json({ error: clientMessage }, { status: 502 })
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
    console.error('❌ Admin users API unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


