import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase'

// Minimal Resend webhook handler: logs delivered, bounced, complained
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    // payload example fields: type, data, created_at
    const eventType = payload?.type || 'unknown'
    const email = payload?.data?.recipient || payload?.data?.to || null
    const providerMessageId = payload?.data?.id || payload?.data?.message_id || null
    const statusMap: Record<string,string> = {
      'email.delivered': 'delivered',
      'email.bounced': 'bounced',
      'email.complained': 'failed',
      'email.opened': 'opened',
      'email.clicked': 'clicked'
    }
    const status = statusMap[eventType] || 'sent'

    const supabase = await getSupabaseClient()
    // We may not have notification_id in webhook; store minimal record
    await supabase.from('email_notification_logs').insert({
      notification_id: null,
      email,
      notification_type: 'webhook',
      status,
      provider: 'resend',
      provider_message_id: providerMessageId,
      error_message: payload?.data?.reason || null,
      sent_at: new Date().toISOString()
    })
    return NextResponse.json({ received: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}


