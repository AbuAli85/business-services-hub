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

    // Simpler: list users from profiles only (avoids auth DB dependency)
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()
    // Use admin client for profiles read to bypass RLS when authorized
    let query = admin
      .from('profiles')
      .select('id, email, full_name, role, phone, company_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,role.ilike.%${q}%`)
    const { data: rows, error: pErr } = await query
    if (pErr) return NextResponse.json({ error: 'Failed to fetch users', details: pErr.message }, { status: 500 })
    const users = (rows || []).map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name || (u.email ? u.email.split('@')[0] : 'User'),
      role: u.role || 'client',
      phone: u.phone || null,
      company_name: u.company_name || null,
      created_at: u.created_at,
      last_sign_in: null,
      status: u.status || 'active',
      is_verified: null,
      two_factor_enabled: null
    }))
    return NextResponse.json({ users })
  } catch (e: any) {
    console.error('❌ Admin users API unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


