import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role;
    if (!userRole) {
      return withCors(jsonError(403, 'FORBIDDEN', 'User profile not found'), request.headers.get('origin'));
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const includeResolved = searchParams.get('includeResolved') === 'true';

    console.log('📊 Insights API: Fetching insights...', { limit, severity, type, includeResolved });

    // Fetch insights using RPC function
    const { data: insights, error: insightsError } = await supabase
      .rpc('get_latest_insights', {
        limit_count: limit,
        severity_filter: severity,
        type_filter: type
      });

    if (insightsError) {
      console.error('Error fetching insights:', insightsError);
      return withCors(jsonError(500, 'INSIGHTS_ERROR', 'Failed to fetch insights'), request.headers.get('origin'));
    }

    // Filter out resolved insights if not requested
    let filteredInsights = insights || [];
    if (!includeResolved) {
      filteredInsights = filteredInsights.filter((insight: any) => !insight.is_resolved);
    }

    // Get additional analytics data for context
    const { data: anomalyData } = await supabase
      .from('v_booking_anomalies')
      .select('*')
      .limit(5);

    const { data: forecastData } = await supabase
      .from('v_revenue_forecast')
      .select('*')
      .limit(7);

    const response = {
      insights: filteredInsights,
      metadata: {
        total: filteredInsights.length,
        severity_counts: {
          critical: filteredInsights.filter((i: any) => i.severity === 'critical').length,
          high: filteredInsights.filter((i: any) => i.severity === 'high').length,
          medium: filteredInsights.filter((i: any) => i.severity === 'medium').length,
          low: filteredInsights.filter((i: any) => i.severity === 'low').length,
        },
        type_counts: filteredInsights.reduce((acc: any, insight: any) => {
          acc[insight.type] = (acc[insight.type] || 0) + 1;
          return acc;
        }, {}),
        generated_at: new Date().toISOString()
      },
      analytics: {
        recent_anomalies: anomalyData?.slice(0, 3) || [],
        revenue_forecast: forecastData?.slice(0, 7) || []
      }
    };

    console.log('📊 Insights API: Successfully fetched', {
      insights_count: filteredInsights.length,
      severity_breakdown: response.metadata.severity_counts
    });

    return withCors(NextResponse.json(response), request.headers.get('origin'));

  } catch (error) {
    console.error('Insights API Error:', error);
    return withCors(jsonError(500, 'INTERNAL_ERROR', 'Internal server error'), request.headers.get('origin'));
  }
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 200 }), request.headers.get('origin'));
}
