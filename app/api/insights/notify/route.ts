import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function withCors(response: NextResponse, origin?: string | null) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return withCors(jsonError(401, 'UNAUTHORIZED', 'Authentication required'), request.headers.get('origin'));
    }

    // Check user role - only admin and provider can trigger notifications
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role;
    if (!userRole || !['admin', 'provider'].includes(userRole)) {
      return withCors(jsonError(403, 'FORBIDDEN', 'Insufficient permissions to trigger notifications'), request.headers.get('origin'));
    }

    // Get request body
    const body = await request.json().catch(() => ({}));
    const { 
      hours_back = 24,
      min_severity = 'high',
      channel_override = null,
      test_mode = false,
      force_notification = false
    } = body;

    console.log('🔔 Manual Notification API: Triggering notifications...', { 
      hours_back, 
      min_severity, 
      channel_override, 
      test_mode,
      triggered_by: user.id,
      user_role: userRole
    });

    // Call the insight notifier Edge Function
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/insight-notifier`;
    
    const notificationResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trigger_type: 'manual',
        hours_back,
        min_severity,
        channel_override,
        test_mode,
        force_notification,
        triggered_by: user.id,
        user_role: userRole
      })
    });

    if (!notificationResponse.ok) {
      const errorData = await notificationResponse.text();
      console.error('Edge function error:', errorData);
      return withCors(jsonError(500, 'NOTIFICATION_ERROR', 'Failed to trigger notifications'), request.headers.get('origin'));
    }

    const notificationResult = await notificationResponse.json();

    // Log the manual trigger event
    const { data: logResult } = await supabase
      .from('insight_run_logs')
      .insert({
        total_insights: notificationResult.insights_processed || 0,
        status: notificationResult.success ? 'success' : 'error',
        duration_ms: 0, // Edge function handles its own timing
        metadata: {
          trigger_type: 'manual_notification',
          triggered_by: user.id,
          user_role: userRole,
          test_mode,
          notification_result: notificationResult,
          request_params: {
            hours_back,
            min_severity,
            channel_override,
            force_notification
          }
        }
      })
      .select()
      .single();

    console.log('🔔 Manual Notification API: Successfully triggered', {
      insights_processed: notificationResult.insights_processed,
      notifications_sent: notificationResult.notifications_sent,
      test_mode
    });

    return withCors(NextResponse.json({
      success: true,
      message: 'Notifications triggered successfully',
      trigger_type: 'manual',
      triggered_by: user.id,
      triggered_at: new Date().toISOString(),
      notification_result: notificationResult,
      log_entry_id: logResult?.id
    }), request.headers.get('origin'));

  } catch (error) {
    console.error('Manual Notification API Error:', error);
    return withCors(jsonError(500, 'INTERNAL_ERROR', 'Internal server error'), request.headers.get('origin'));
  }
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 200 }), request.headers.get('origin'));
}
