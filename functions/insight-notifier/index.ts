// @ts-expect-error - Deno URL imports work in Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error - Deno URL imports work in Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Insight {
  id: string
  type: string
  severity: string
  title: string
  summary: string
  recommendation: string
  confidence_score: number
  created_at: string
}

interface NotificationChannel {
  id: string
  name: string
  type: 'slack' | 'email' | 'webhook' | 'dashboard'
  config: Record<string, any>
  severity_filter: string[]
}

interface NotificationResult {
  success: boolean
  method: string
  response_status?: number
  recipients_count?: number
  realtime_enabled?: boolean
  error?: string
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { 
      trigger_type = 'automated',
      hours_back = 24,
      min_severity = 'high',
      channel_override = null,
      test_mode = false 
    } = await req.json().catch(() => ({}))

    console.log('🔔 Insight Notifier triggered:', { trigger_type, hours_back, min_severity, test_mode })

    // Get insights for notification
    const { data: insights, error: insightsError } = await supabaseClient
      .rpc('get_insights_for_notification', {
        hours_back,
        min_severity
      })

    if (insightsError) {
      console.error('Error fetching insights:', insightsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch insights', details: insightsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!insights || insights.length === 0) {
      console.log('No insights to notify about')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No insights to notify about',
          insights_checked: 0,
          notifications_sent: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get notification channels
    const { data: channels, error: channelsError } = await supabaseClient
      .from('notification_channels')
      .select('*')
      .eq('is_active', true)

    if (channelsError) {
      console.error('Error fetching notification channels:', channelsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notification channels', details: channelsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const notificationResults = []
    let totalNotificationsSent = 0

    // Process each insight
    for (const insight of insights as Insight[]) {
      console.log(`Processing insight: ${insight.title} (${insight.severity})`)

      // Filter channels based on severity
      const eligibleChannels = (channels as NotificationChannel[]).filter(channel => 
        channel.severity_filter.includes(insight.severity)
      )

      // Override channels if specified
      const targetChannels = channel_override 
        ? (channels as NotificationChannel[]).filter(ch => ch.id === channel_override)
        : eligibleChannels

      // Send notifications to each channel
      for (const channel of targetChannels) {
        try {
          const notificationResult = await sendNotification(insight, channel, test_mode)
          
          // Log the notification attempt
          const { data: logResult } = await supabaseClient
            .rpc('log_notification_attempt', {
              p_insight_id: insight.id,
              p_channel_id: channel.id,
              p_status: notificationResult.success ? 'sent' : 'failed',
              p_error_message: notificationResult.error || null,
              p_metadata: {
                trigger_type,
                test_mode,
                channel_type: channel.type,
                notification_method: notificationResult.method
              }
            })

          notificationResults.push({
            insight_id: insight.id,
            insight_title: insight.title,
            channel_name: channel.name,
            channel_type: channel.type,
            success: notificationResult.success,
            error: notificationResult.error || null,
            method: notificationResult.method
          })

          if (notificationResult.success) {
            totalNotificationsSent++
          }

        } catch (error: any) {
          console.error(`Failed to send notification for insight ${insight.id} to channel ${channel.name}:`, error)
          
          // Log failed attempt
          await supabaseClient
            .rpc('log_notification_attempt', {
              p_insight_id: insight.id,
              p_channel_id: channel.id,
              p_status: 'failed',
              p_error_message: error?.message || 'Unknown error',
              p_metadata: { trigger_type, test_mode, error_context: 'notification_sending_failed' }
            })

          notificationResults.push({
            insight_id: insight.id,
            insight_title: insight.title,
            channel_name: channel.name,
            channel_type: channel.type,
            success: false,
            error: error?.message || 'Unknown error',
            method: 'unknown'
          })
        }
      }
    }

    console.log(`✅ Notification processing complete: ${totalNotificationsSent} notifications sent`)

    return new Response(
      JSON.stringify({
        success: true,
        trigger_type,
        insights_processed: insights.length,
        channels_used: channels?.length || 0,
        notifications_sent: totalNotificationsSent,
        results: notificationResults,
        test_mode
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Insight notifier error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error?.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendNotification(insight: Insight, channel: NotificationChannel, testMode: boolean) {
  const severityEmoji = {
    critical: '🚨',
    high: '⚠️',
    medium: 'ℹ️',
    low: '💡'
  }

  const typeEmoji = {
    booking_slowdown: '📉',
    booking_spike: '📈',
    revenue_anomaly: '💰',
    provider_overload: '👥',
    milestone_delay: '⏰',
    capacity_warning: '⚠️',
    optimization_recommendation: '🎯'
  }

  const emoji = typeEmoji[insight.type as keyof typeof typeEmoji] || '🔮'
  const severityIcon = severityEmoji[insight.severity as keyof typeof severityEmoji] || '📊'

  switch (channel.type) {
    case 'slack':
      return await sendSlackNotification(insight, channel, emoji, severityIcon, testMode)
    
    case 'email':
      return await sendEmailNotification(insight, channel, emoji, severityIcon, testMode)
    
    case 'webhook':
      return await sendWebhookNotification(insight, channel, testMode)
    
    case 'dashboard':
      return await sendDashboardNotification(insight, channel, testMode)
    
    default:
      throw new Error(`Unsupported notification channel type: ${channel.type}`)
  }
}

async function sendSlackNotification(insight: Insight, channel: NotificationChannel, emoji: string, severityIcon: string, testMode: boolean): Promise<NotificationResult> {
  const webhookUrl = channel.config.webhook_url
  if (!webhookUrl) {
    throw new Error('Slack webhook URL not configured')
  }

  const slackMessage: any = {
    text: `${emoji} ${severityIcon} New Business Insight`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${insight.title}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Severity:* ${insight.severity.toUpperCase()}`
          },
          {
            type: 'mrkdwn',
            text: `*Confidence:* ${Math.round(insight.confidence_score * 100)}%`
          },
          {
            type: 'mrkdwn',
            text: `*Type:* ${insight.type.replace('_', ' ')}`
          },
          {
            type: 'mrkdwn',
            text: `*Generated:* ${new Date(insight.created_at).toLocaleString()}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:*\n${insight.summary}`
        }
      }
    ]
  }

  if (insight.recommendation) {
    slackMessage.blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Recommendation:*\n${insight.recommendation}`
      }
    })
  }

  if (testMode) {
    slackMessage.blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '_🧪 Test Mode - This is a test notification_'
        }
      ]
    })
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slackMessage)
  })

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status} ${response.statusText}`)
  }

  return {
    success: true,
    method: 'slack',
    response_status: response.status
  }
}

async function sendEmailNotification(insight: Insight, channel: NotificationChannel, emoji: string, severityIcon: string, testMode: boolean): Promise<NotificationResult> {
  // This would integrate with Resend, SendGrid, or similar email service
  // For now, we'll simulate the email sending
  const recipients = channel.config.recipients || []
  const subjectTemplate = channel.config.subject_template || 'Business Insight Alert'

  const emailData = {
    to: recipients,
    subject: testMode 
      ? `[TEST] ${subjectTemplate}` 
      : `${severityIcon} ${subjectTemplate}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${emoji} ${insight.title}</h2>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Severity:</strong> ${insight.severity.toUpperCase()}</p>
          <p><strong>Confidence:</strong> ${Math.round(insight.confidence_score * 100)}%</p>
          <p><strong>Type:</strong> ${insight.type.replace('_', ' ')}</p>
          <p><strong>Generated:</strong> ${new Date(insight.created_at).toLocaleString()}</p>
        </div>
        
        <h3>Summary</h3>
        <p>${insight.summary}</p>
        
        ${insight.recommendation ? `
          <h3>Recommendation</h3>
          <p>${insight.recommendation}</p>
        ` : ''}
        
        ${testMode ? `
          <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 20px;">
            <p><em>🧪 This is a test notification</em></p>
          </div>
        ` : ''}
      </div>
    `
  }

  // Simulate email sending (replace with actual email service integration)
  console.log('Email notification prepared:', emailData)
  
  return {
    success: true,
    method: 'email',
    recipients_count: recipients.length
  }
}

async function sendWebhookNotification(insight: Insight, channel: NotificationChannel, testMode: boolean): Promise<NotificationResult> {
  const webhookUrl = channel.config.url
  if (!webhookUrl) {
    throw new Error('Webhook URL not configured')
  }

  const payload = {
    insight: {
      id: insight.id,
      type: insight.type,
      severity: insight.severity,
      title: insight.title,
      summary: insight.summary,
      recommendation: insight.recommendation,
      confidence_score: insight.confidence_score,
      created_at: insight.created_at
    },
    metadata: {
      test_mode: testMode,
      sent_at: new Date().toISOString(),
      source: 'insight_notifier'
    }
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(channel.config.headers || {})
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    throw new Error(`Webhook error: ${response.status} ${response.statusText}`)
  }

  return {
    success: true,
    method: 'webhook',
    response_status: response.status
  }
}

async function sendDashboardNotification(insight: Insight, channel: NotificationChannel, testMode: boolean): Promise<NotificationResult> {
  // Dashboard notifications are handled via realtime subscriptions
  // This function logs the notification for dashboard display
  console.log('Dashboard notification:', {
    insight_id: insight.id,
    title: insight.title,
    severity: insight.severity,
    test_mode: testMode
  })

  return {
    success: true,
    method: 'dashboard',
    realtime_enabled: true
  }
}
