import { NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

type EmailPayload = {
  to: string | string[]
  subject: string
  text?: string
  html?: string
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.SENDGRID_API_KEY
    const from = process.env.SENDGRID_FROM || process.env.SENDGRID_VERIFIED_SENDER

    if (!apiKey || !from) {
      return NextResponse.json({ error: 'Missing SendGrid configuration' }, { status: 500 })
    }

    const body: EmailPayload = await req.json()
    if (!body?.to || !body?.subject || (!body.text && !body.html)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    sgMail.setApiKey(apiKey)

    const msg = {
      to: body.to,
      from,
      subject: body.subject,
      text: body.text,
      html: body.html
    }

    await sgMail.send(msg as any)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('SendGrid error:', error?.response?.body || error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}


