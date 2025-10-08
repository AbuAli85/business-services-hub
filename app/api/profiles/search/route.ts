'use server'

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase-middleware'

export async function GET(req: NextRequest) {
  try {
    // Get access token from cookies or Authorization header
    let token = req.cookies.get('sb-access-token')?.value
    const authHeader = req.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
    
    if (bearerToken && (!token || token !== bearerToken)) {
      token = bearerToken
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use custom middleware client to avoid cookie parsing issues
    const supabase = createMiddlewareClient(req)
    const { data, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !data || !data.user) {
      console.warn('⚠️ Profile search auth error:', authError?.message || 'No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = data.user

    const url = new URL(req.url)
    const id = (url.searchParams.get('id') || '').trim()
    const q = (url.searchParams.get('q') || '').trim()
    const role = (url.searchParams.get('role') || '').trim() // 'client' | 'provider' | ''
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit') || '10')))

    // If searching by ID, return that specific profile
    if (id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, phone, company_name')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          return NextResponse.json({ profiles: [] })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ profiles: data ? [data] : [] })
    }

    // Otherwise, search by query string
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, role', { count: 'exact' })
      .order('full_name')
      .limit(limit)

    if (role === 'client' || role === 'provider') {
      query = query.eq('role', role)
    }

    if (q) {
      query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ results: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}


