import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleOptions, badRequest, ok } from '@/lib/api-helpers'

export async function OPTIONS(request: NextRequest) {
  return handleOptions()
}

const Schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  service_category: z.string().min(2),
  message: z.string().min(10),
  preferred_channel: z.enum(['phone', 'email', 'whatsapp'])
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = Schema.safeParse(json)
    if (!parsed.success) return badRequest('Invalid data', parsed.error.errors)

    const { name, email, phone, company, service_category, message, preferred_channel } = parsed.data
    const html = `
      <h2>New Consultation Request</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || '-'}</p>
      <p><strong>Company:</strong> ${company || '-'}</p>
      <p><strong>Category:</strong> ${service_category}</p>
      <p><strong>Preferred channel:</strong> ${preferred_channel}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space:pre-wrap">${message}</pre>
    `
    const text = `New Consultation Request\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '-'}\nCompany: ${company || '-'}\nCategory: ${service_category}\nPreferred: ${preferred_channel}\n\nMessage:\n${message}`

    // Forward through existing email endpoint
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: process.env.CONSULTATION_INBOX || 'hello@businesshub.com',
        subject: `Consultation request: ${service_category} — ${name}`,
        html,
        text,
        from: process.env.MAIL_FROM || 'onboarding@resend.dev',
        replyTo: email
      })
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ success: false, error: 'Failed to send email', details: err }, { status: 502 })
    }

    return ok({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Internal error' }, { status: 500 })
  }
}


