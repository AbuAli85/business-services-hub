'use server'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') || '').trim()
    const role = (url.searchParams.get('role') || '').trim() // 'client' | 'provider' | ''
    const limit = Math.min(20, Math.max(1, Number(url.searchParams.get('limit') || '10')))

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


