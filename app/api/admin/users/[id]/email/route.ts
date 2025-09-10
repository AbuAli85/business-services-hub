import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = getSupabaseAdminClient()
    const userId = params.id
    if (!userId) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Admin auth via Bearer token
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : ''
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: tokenUser, error: tokenErr } = await admin.auth.getUser(token)
    if (tokenErr || !tokenUser?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const metaRole = (tokenUser.user.user_metadata as any)?.role
    if (metaRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const action = (body?.action as string) || ''
    const email = (body?.email as string) || ''
    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

    if (action === 'resend_verification') {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
      const { data, error } = await admin.auth.admin.generateLink({ type: 'signup', email })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, linkType: 'signup', data })
    }

    if (action === 'send_reset') {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
      const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, linkType: 'recovery', data })
    }

    if (action === 'invite') {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, user: data?.user })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


