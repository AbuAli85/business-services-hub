import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text, from, replyTo, notificationId, notificationType, userId } = await request.json()

    if (!to || !subject || !html || !text) {
      return NextResponse.json(
        { error: 'Missing required email fields (to, subject, html, text)' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY environment variable is not set' },
        { status: 500 }
      )
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: from || 'notifications@yourdomain.com',
      to: to,
      subject: subject,
      html: html,
      text: text,
      replyTo: replyTo || 'noreply@yourdomain.com',
      headers: {
        'X-Notification-ID': notificationId || '',
        'X-Notification-Type': notificationType || '',
        'X-User-ID': userId || '',
      },
    })

    if (error) {
      console.error('Resend email error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, messageId: data?.id })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
