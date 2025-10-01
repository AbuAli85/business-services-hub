import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getSupabaseClient } from '@/lib/supabase'
import { BookingIdSchema } from '@/lib/validate'
import { jsonError } from '@/lib/http'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const parsed = BookingIdSchema.safeParse(params)
  if (!parsed.success) return jsonError(400, 'BAD_ID', 'Invalid booking id')
  const supabase = await getSupabaseClient()

  // Support Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : undefined
  const { data: auth } = await supabase.auth.getUser(token)
  if (!auth?.user) return jsonError(401, 'UNAUTHENTICATED', 'User not authenticated')

  const { data: b, error } = await supabase
    .from('bookings')
    .select('id,status,provider_id')
    .eq('id', params.id)
    .single()

  if (error || !b) return jsonError(404, 'NOT_FOUND', 'Booking not found')
  if (auth.user.id !== b.provider_id) return jsonError(403, 'FORBIDDEN', 'Only provider can decline this booking')
  const isPendingLike = (b.status || '').toLowerCase() === 'pending_provider_approval' || (b.status || '').toLowerCase() === 'pending' || (b.status || '').toLowerCase() === 'provider_review'
  if (!isPendingLike) return jsonError(400, 'INVALID_STATE', 'Booking not pending provider approval')

  const { error: uErr } = await supabase
    .from('bookings')
    .update({ 
      status: 'declined', 
      approval_status: 'rejected',
      updated_at: new Date().toISOString() 
    })
    .eq('id', params.id)

  if (uErr) {
    console.error('Decline booking failed', { bookingId: params.id, error: uErr })
    return jsonError(500, 'UPDATE_FAILED', uErr.message, { code: (uErr as any).code, details: (uErr as any).details })
  }

  // Non-blocking audit log (optional)
  try {
    const actorId = auth.user.id
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL}/audit-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE}`
      },
      body: JSON.stringify({ bookingId: params.id, action: 'decline', actorId })
    }).catch(() => {})
  } catch {}

  try { revalidateTag(`booking:${params.id}`) } catch {}

  return NextResponse.json({ ok: true })
}


