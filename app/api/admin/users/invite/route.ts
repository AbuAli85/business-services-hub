import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const admin = getSupabaseAdminClient()
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tokenUser, error: tokenErr } = await admin.auth.getUser(token)
    if (tokenErr || !tokenUser?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const metaRole = (tokenUser.user.user_metadata as any)?.role
    if (metaRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, user: data?.user })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


