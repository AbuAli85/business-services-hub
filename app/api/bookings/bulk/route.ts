import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  const bookingIds = (body.booking_ids as string[]) || []

  if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
    return NextResponse.json({ error: 'booking_ids required' }, { status: 400 })
  }

  const supabase = await createClient()

  if (action === 'update_status') {
    const status = String(body.status || '')
    if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 })
    const { error } = await supabase.from('bookings').update({ status }).in('id', bookingIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unsupported action' }, { status: 400 })
}


