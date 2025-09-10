import { NextResponse } from 'next/server'

// We prefer Resend in production if key is available; otherwise fallback to SendGrid
const USE_RESEND = !!process.env.RESEND_API_KEY

// Lazy imports to avoid hard dependency when not configured
let resendInstance: any = null as any
async function getResend() {
  if (!USE_RESEND) return null
  if (resendInstance) return resendInstance
  const { Resend } = await import('resend')
  resendInstance = new Resend(process.env.RESEND_API_KEY as string)
  return resendInstance
}

let sgMail: any = null as any
async function getSendGrid() {
  if (sgMail) return sgMail
  const mod = await import('@sendgrid/mail')
  sgMail = mod.default
  return sgMail
}

type EmailPayload = {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}

export async function POST(req: Request) {
  try {
    const from = process.env.SEND_FROM || process.env.RESEND_FROM || process.env.SENDGRID_FROM || process.env.SENDGRID_VERIFIED_SENDER
    if (!from) return NextResponse.json({ error: 'Missing FROM address (SEND_FROM/RESEND_FROM/SENDGRID_FROM)' }, { status: 500 })

    const body: EmailPayload = await req.json()
    if (!body?.to || !body?.subject || (!body.text && !body.html)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Prefer Resend when configured
    if (USE_RESEND) {
      const resend = await getResend()
      if (!resend) return NextResponse.json({ error: 'Resend not available' }, { status: 500 })
      const { error } = await resend.emails.send({
        from,
        to: body.to,
        subject: body.subject,
        html: body.html,
        text: body.text
      } as any)
      if (error) {
        console.error('Resend error:', error)
        return NextResponse.json({ error: 'Failed to send email via Resend' }, { status: 500 })
      }
      return NextResponse.json({ success: true, provider: 'resend' })
    }

    // Fallback to SendGrid
    const sg = await getSendGrid()
    const sendgridKey = process.env.SENDGRID_API_KEY
    if (!sendgridKey) {
      return NextResponse.json({ error: 'Missing SendGrid API key' }, { status: 500 })
    }
    sg.setApiKey(sendgridKey)
    const msg = { to: body.to, from, subject: body.subject, text: body.text, html: body.html }
    await sg.send(msg as any)
    return NextResponse.json({ success: true, provider: 'sendgrid' })
  } catch (error: any) {
    console.error('Email send error:', error?.response?.body || error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}


