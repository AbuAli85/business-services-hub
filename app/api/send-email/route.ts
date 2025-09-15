import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { rateLimit, handleOptions, badRequest, ok } from '@/lib/api-helpers'

export async function OPTIONS(request: NextRequest) {
  return handleOptions()
}

export async function POST(request: NextRequest) {
  // Rate limit by IP for email endpoint
  const limited = rateLimit(request, { key: 'send-email', windowMs: 60_000, max: 20 })
  if (!limited.allowed) return limited.response!

  try {
    console.log('Email API called with method:', request.method)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const { to, subject, html, text, from, replyTo, notificationId, notificationType, userId } = await request.json()
    console.log('Email request data:', { to, subject, from, replyTo, notificationId, notificationType, userId })

    if (!to || !subject || !html || !text) {
      return badRequest('Missing required email fields (to, subject, html, text)')
    }

    // Check for Resend API key with detailed logging
    console.log('🔍 Environment check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      keyLength: process.env.RESEND_API_KEY?.length || 0,
      keyPrefix: process.env.RESEND_API_KEY?.substring(0, 3) || 'none',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('RESEND') || key.includes('resend'))
    })

    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not found in environment variables')
      return NextResponse.json(
        { 
          success: false,
          error: 'RESEND_API_KEY environment variable is not set',
          details: 'Please add RESEND_API_KEY to your Vercel environment variables'
        },
        { status: 500 }
      )
    }

    console.log('🔑 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
    console.log('🔑 RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0)
    
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    const emailPayload = {
      from: from || 'onboarding@resend.dev', // Use Resend's default domain
      to: to,
      subject: subject,
      html: html,
      text: text,
      replyTo: replyTo || 'noreply@resend.dev', // Use Resend's default domain
      headers: {
        'X-Notification-ID': notificationId || '',
        'X-Notification-Type': notificationType || '',
        'X-User-ID': userId || '',
      },
    }
    
    console.log('📧 Sending email with Resend payload:', {
      from: emailPayload.from,
      to: emailPayload.to,
      subject: emailPayload.subject,
      replyTo: emailPayload.replyTo,
      hasHtml: !!emailPayload.html,
      hasText: !!emailPayload.text,
      headers: emailPayload.headers
    })
    
    const { data, error } = await resend.emails.send(emailPayload)
    
    console.log('📊 Resend response:', { data, error })

    if (error) {
      console.error('❌ Resend email error:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    console.log('✅ Email sent successfully! Message ID:', data?.id)
    return ok({ success: true, messageId: data?.id })
  } catch (error) {
    console.error('Email API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 })
  }
}
