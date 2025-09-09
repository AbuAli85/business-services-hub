import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    console.log('Email API called with method:', request.method)
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    
    const { to, subject, html, text, from, replyTo, notificationId, notificationType, userId } = await request.json()
    console.log('Email request data:', { to, subject, from, replyTo, notificationId, notificationType, userId })

    if (!to || !subject || !html || !text) {
      return NextResponse.json(
        { error: 'Missing required email fields (to, subject, html, text)' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      )
    }

    // Check for Resend API key
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY environment variable is not set' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      )
    }

    console.log('🔑 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
    console.log('🔑 RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0)
    
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    const emailPayload = {
      from: from || 'notifications@thedigitalmorph.com',
      to: to,
      subject: subject,
      html: html,
      text: text,
      replyTo: replyTo || 'noreply@thedigitalmorph.com',
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
      return NextResponse.json(
        { success: false, error: error.message },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      )
    }

    console.log('✅ Email sent successfully! Message ID:', data?.id)
    return NextResponse.json(
      { success: true, messageId: data?.id },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  } catch (error) {
    console.error('Email API error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    )
  }
}
