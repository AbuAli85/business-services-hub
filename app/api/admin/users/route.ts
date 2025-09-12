'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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
    const profileUsers = ((rows || []).map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name || (u.email ? u.email.split('@')[0] : 'User'),
      role: u.role || 'client',
      phone: u.phone || null,
      company_name: u.company_name || null,
      created_at: u.created_at,
      last_sign_in: null as string | null,
      status: u.status || 'active',
      is_verified: null as boolean | null,
      two_factor_enabled: null as boolean | null
    })) as any[])
    // Try to merge with auth users to include any without profiles
    let merged: any[] = [...profileUsers]
    try {
      const res: any = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const authUsers = res?.data?.users || res?.users || []
      if (authUsers?.length) {
        const seen = new Set(merged.map(u => u.id))
        for (const au of authUsers) {
          if (q) {
            const s = q.toLowerCase()
            const em = (au.email || '').toLowerCase()
            const name = ((au.user_metadata?.full_name as string) || '').toLowerCase()
            if (!(em.includes(s) || name.includes(s))) continue
          }
          if (seen.has(au.id)) continue
          merged.push({
            id: au.id,
            email: au.email,
            full_name: (au.user_metadata?.full_name as string) || (au.email ? au.email.split('@')[0] : 'User'),
            role: (au.user_metadata?.role as string) || 'client',
            phone: null,
            company_name: null,
            created_at: au.created_at,
            last_sign_in: au.last_sign_in_at ? String(au.last_sign_in_at) : null,
            status: 'pending',
            is_verified: !!au.email_confirmed_at,
            two_factor_enabled: Array.isArray((au as any).factors) && (au as any).factors.length > 0
          })
        }
        // Sort by created_at desc
        merged.sort((a, b) => (new Date(b.created_at).getTime()) - (new Date(a.created_at).getTime()))
      }
    } catch {}
    return NextResponse.json({ users: merged })
  } catch (e: any) {
    console.error('❌ Admin users API unexpected error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


