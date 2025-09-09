import { NextRequest, NextResponse } from 'next/server'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

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

    // Check for AWS SES credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json(
        { error: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY' },
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

    console.log('🔑 AWS credentials exist:', {
      accessKey: !!process.env.AWS_ACCESS_KEY_ID,
      secretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    })
    
    // Initialize SES client
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
    
    const emailPayload = {
      Source: from || 'send@marketing.thedigitalmorph.com', // Use your verified domain
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: text,
            Charset: 'UTF-8',
          },
        },
      },
      ReplyToAddresses: [replyTo || 'noreply@marketing.thedigitalmorph.com'],
      Tags: [
        {
          Name: 'Notification-ID',
          Value: notificationId || '',
        },
        {
          Name: 'Notification-Type',
          Value: notificationType || '',
        },
        {
          Name: 'User-ID',
          Value: userId || '',
        },
      ],
    }
    
    console.log('📧 Sending email with SES payload:', {
      Source: emailPayload.Source,
      ToAddresses: emailPayload.Destination.ToAddresses,
      Subject: emailPayload.Message.Subject.Data,
      ReplyToAddresses: emailPayload.ReplyToAddresses,
      hasHtml: !!emailPayload.Message.Body.Html.Data,
      hasText: !!emailPayload.Message.Body.Text.Data,
      Tags: emailPayload.Tags
    })
    
    const command = new SendEmailCommand(emailPayload)
    const response = await sesClient.send(command)
    
    console.log('📊 SES response:', response)

    if (response.$metadata.httpStatusCode !== 200) {
      console.error('❌ SES email error:', response.$metadata)
      return NextResponse.json(
        { success: false, error: 'Failed to send email via SES' },
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

    console.log('✅ Email sent successfully! Message ID:', response.MessageId)
    return NextResponse.json(
      { success: true, messageId: response.MessageId },
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
