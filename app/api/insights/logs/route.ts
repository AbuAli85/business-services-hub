import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return withCors(jsonError(401, 'UNAUTHORIZED', 'Authentication required'), request.headers.get('origin'));
    }

    // Check user role - only admin and provider can view logs
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role;
    if (!userRole || !['admin', 'provider'].includes(userRole)) {
      return withCors(jsonError(403, 'FORBIDDEN', 'Insufficient permissions to view logs'), request.headers.get('origin'));
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const days = parseInt(searchParams.get('days') || '7');
    const status = searchParams.get('status'); // Filter by status
    const includeMetadata = searchParams.get('includeMetadata') === 'true';

    console.log('📋 Insights Logs API: Fetching logs...', { limit, days, status, includeMetadata });

    // Build query
    let query = supabase
      .from('insight_run_logs')
      .select(includeMetadata ? '*' : 'id, run_at, total_insights, status, duration_ms, error_message')
      .gte('run_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('run_at', { ascending: false })
      .limit(limit);

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching insight logs:', logsError);
      return withCors(jsonError(500, 'LOGS_ERROR', 'Failed to fetch insight logs'), request.headers.get('origin'));
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .rpc('get_insight_run_stats', {
        days_back: days
      });

    // Get notification logs for the same period
    const { data: notificationLogs } = await supabase
      .from('insight_notifications')
      .select('status, created_at, channel_id')
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

    // Get channel information
    const { data: channels } = await supabase
      .from('notification_channels')
      .select('id, name, type, is_active');

    const channelMap = channels?.reduce((acc: any, channel: any) => {
      acc[channel.id] = channel;
      return acc;
    }, {}) || {};

    // Process notification statistics
    const notificationStats = {
      total: notificationLogs?.length || 0,
      sent: notificationLogs?.filter((n: any) => n.status === 'sent').length || 0,
      failed: notificationLogs?.filter((n: any) => n.status === 'failed').length || 0,
      pending: notificationLogs?.filter((n: any) => n.status === 'pending').length || 0,
      by_channel: notificationLogs?.reduce((acc: any, log: any) => {
        const channel = channelMap[log.channel_id];
        if (channel) {
          if (!acc[channel.name]) {
            acc[channel.name] = { sent: 0, failed: 0, total: 0 };
          }
          acc[channel.name][log.status] = (acc[channel.name][log.status] || 0) + 1;
          acc[channel.name].total += 1;
        }
        return acc;
      }, {}) || {}
    };

    const response = {
      logs: logs || [],
      statistics: {
        run_stats: stats?.[0] || {
          total_runs: 0,
          successful_runs: 0,
          failed_runs: 0,
          avg_duration_ms: 0,
          total_insights_generated: 0,
          avg_insights_per_run: 0,
          last_run_at: null,
          last_run_status: null
        },
        notification_stats: notificationStats,
        period: {
          days_back: days,
          start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        }
      },
      metadata: {
        total_logs_returned: logs?.length || 0,
        requested_limit: limit,
        status_filter: status || 'all',
        include_metadata: includeMetadata,
        fetched_at: new Date().toISOString()
      }
    };

    console.log('📋 Insights Logs API: Successfully fetched', {
      logs_count: logs?.length || 0,
      total_runs: response.statistics.run_stats.total_runs,
      success_rate: response.statistics.run_stats.total_runs > 0 
        ? Math.round((response.statistics.run_stats.successful_runs / response.statistics.run_stats.total_runs) * 100)
        : 0
    });

    return withCors(NextResponse.json(response), request.headers.get('origin'));

  } catch (error) {
    console.error('Insights Logs API Error:', error);
    return withCors(jsonError(500, 'INTERNAL_ERROR', 'Internal server error'), request.headers.get('origin'));
  }
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 200 }), request.headers.get('origin'));
}
