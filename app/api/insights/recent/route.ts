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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const minSeverity = searchParams.get('minSeverity') || 'medium';
    const includeResolved = searchParams.get('includeResolved') === 'true';

    console.log('📊 Recent Insights API: Fetching insights...', { hours, minSeverity, includeResolved });

    // Fetch recent insights using RPC function
    const { data: insights, error: insightsError } = await supabase
      .rpc('get_insights_for_notification', {
        hours_back: hours,
        min_severity: minSeverity
      });

    if (insightsError) {
      console.error('Error fetching recent insights:', insightsError);
      return withCors(jsonError(500, 'INSIGHTS_ERROR', 'Failed to fetch recent insights'), request.headers.get('origin'));
    }

    // Filter out resolved insights if not requested
    let filteredInsights = insights || [];
    if (!includeResolved) {
      filteredInsights = filteredInsights.filter((insight: any) => !insight.is_resolved);
    }

    // Get automation run statistics
    const { data: runStats } = await supabase
      .rpc('get_insight_run_stats', {
        days_back: 7
      });

    // Get recent run logs
    const { data: runLogs } = await supabase
      .from('insight_run_logs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(10);

    // Get notification statistics
    const { data: notificationStats } = await supabase
      .from('insight_notifications')
      .select('status, created_at')
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

    const response = {
      insights: filteredInsights,
      automation_stats: {
        total_runs: runStats?.[0]?.total_runs || 0,
        successful_runs: runStats?.[0]?.successful_runs || 0,
        failed_runs: runStats?.[0]?.failed_runs || 0,
        avg_duration_ms: runStats?.[0]?.avg_duration_ms || 0,
        total_insights_generated: runStats?.[0]?.total_insights_generated || 0,
        last_run_at: runStats?.[0]?.last_run_at,
        last_run_status: runStats?.[0]?.last_run_status,
        success_rate: runStats?.[0]?.total_runs > 0 
          ? Math.round((runStats[0].successful_runs / runStats[0].total_runs) * 100)
          : 0
      },
      recent_runs: runLogs || [],
      notification_stats: {
        total_notifications: notificationStats?.length || 0,
        sent_notifications: notificationStats?.filter((n: any) => n.status === 'sent').length || 0,
        failed_notifications: notificationStats?.filter((n: any) => n.status === 'failed').length || 0,
        success_rate: (notificationStats?.length || 0) > 0
          ? Math.round((notificationStats?.filter((n: any) => n.status === 'sent').length || 0) / (notificationStats?.length || 1) * 100)
          : 0
      },
      metadata: {
        hours_back: hours,
        min_severity: minSeverity,
        include_resolved: includeResolved,
        fetched_at: new Date().toISOString()
      }
    };

    console.log('📊 Recent Insights API: Successfully fetched', {
      insights_count: filteredInsights.length,
      automation_success_rate: response.automation_stats.success_rate,
      notification_success_rate: response.notification_stats.success_rate
    });

    return withCors(NextResponse.json(response), request.headers.get('origin'));

  } catch (error) {
    console.error('Recent Insights API Error:', error);
    return withCors(jsonError(500, 'INTERNAL_ERROR', 'Internal server error'), request.headers.get('origin'));
  }
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 200 }), request.headers.get('origin'));
}
