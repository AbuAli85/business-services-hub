import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    // Counts from common tables; ignore errors individually
    async function count(table: string, col: string = 'id') {
      try {
        const { count } = await admin.from(table).select(col, { count: 'exact', head: true }).eq('client_id', userId)
        return count || 0
      } catch {
        return 0
      }
    }
    // Some tables use different foreign keys; try provider_id as well
    async function countAny(table: string) {
      const asClient = await count(table, 'id')
      try {
        const { count } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('provider_id', userId)
        return asClient + (count || 0)
      } catch {
        return asClient
      }
    }

    const [bookings, messages, invoices, notifications] = await Promise.all([
      countAny('bookings').catch(()=>0),
      countAny('messages').catch(()=>0),
      countAny('invoices').catch(()=>0),
      (async ()=>{ try { const { count } = await admin.from('notifications').select('id', { count:'exact', head:true }).eq('user_id', userId); return count||0 } catch { return 0 } })()
    ])

    return NextResponse.json({ bookings, messages, invoices, notifications })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


