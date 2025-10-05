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

    // Check user role - only admin and provider can generate insights
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role;
    if (!userRole || !['admin', 'provider'].includes(userRole)) {
      return withCors(jsonError(403, 'FORBIDDEN', 'Insufficient permissions to generate insights'), request.headers.get('origin'));
    }

    console.log('🤖 Insights Generation API: Starting insight generation...', { user_id: user.id, role: userRole });

    // Get optional parameters from request body
    const body = await request.json().catch(() => ({}));
    const { force_regenerate = false, include_forecasts = true } = body;

    // Check if insights were generated recently (within last hour) unless forced
    if (!force_regenerate) {
      const { data: recentInsights } = await supabase
        .from('insight_events')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .limit(1);

      if (recentInsights && recentInsights.length > 0) {
        console.log('🤖 Insights already generated recently, skipping...');
        return withCors(NextResponse.json({
          success: true,
          message: 'Insights already generated recently',
          generated_at: recentInsights[0].created_at,
          skip_reason: 'recent_generation'
        }), request.headers.get('origin'));
      }
    }

    // Generate insights using RPC function
    const { data: generatedInsights, error: generationError } = await supabase
      .rpc('generate_daily_insights');

    if (generationError) {
      console.error('Error generating insights:', generationError);
      return withCors(jsonError(500, 'GENERATION_ERROR', 'Failed to generate insights'), request.headers.get('origin'));
    }

    console.log('🤖 Insights Generation API: Generated insights', {
      count: generatedInsights?.length || 0,
      types: generatedInsights?.map((i: any) => i.type) || []
    });

    // Get additional analytics data
    const { data: anomalyData } = await supabase
      .from('v_booking_anomalies')
      .select('*')
      .limit(10);

    const { data: forecastData } = await supabase
      .from('v_revenue_forecast')
      .select('*')
      .limit(30);

    const { data: providerData } = await supabase
      .from('v_provider_workload_analytics')
      .select('*')
      .limit(20);

    // Generate summary statistics
    const summary = {
      total_insights_generated: generatedInsights?.length || 0,
      severity_breakdown: {
        critical: generatedInsights?.filter((i: any) => i.severity === 'critical').length || 0,
        high: generatedInsights?.filter((i: any) => i.severity === 'high').length || 0,
        medium: generatedInsights?.filter((i: any) => i.severity === 'medium').length || 0,
        low: generatedInsights?.filter((i: any) => i.severity === 'low').length || 0,
      },
      type_breakdown: generatedInsights?.reduce((acc: any, insight: any) => {
        acc[insight.type] = (acc[insight.type] || 0) + 1;
        return acc;
      }, {}) || {},
      anomalies_detected: anomalyData?.filter((a: any) => a.booking_anomaly || a.revenue_anomaly).length || 0,
      providers_analyzed: providerData?.length || 0,
      forecast_generated: include_forecasts ? forecastData?.length || 0 : 0
    };

    const response = {
      success: true,
      message: 'Insights generated successfully',
      generated_at: new Date().toISOString(),
      generated_by: user.id,
      summary,
      insights: generatedInsights || [],
      analytics: {
        anomalies: anomalyData || [],
        forecasts: include_forecasts ? forecastData : [],
        provider_analytics: providerData || []
      }
    };

    console.log('🤖 Insights Generation API: Successfully completed', summary);

    return withCors(NextResponse.json(response), request.headers.get('origin'));

  } catch (error) {
    console.error('Insights Generation API Error:', error);
    return withCors(jsonError(500, 'INTERNAL_ERROR', 'Internal server error'), request.headers.get('origin'));
  }
}

export async function OPTIONS(request: NextRequest) {
  return withCors(new NextResponse(null, { status: 200 }), request.headers.get('origin'));
}
