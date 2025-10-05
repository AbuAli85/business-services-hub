import { NextRequest, NextResponse } from 'next/server'
import { makeServerClient } from '@/utils/supabase/makeServerClient'
import { jsonError } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await makeServerClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return jsonError(401, 'UNAUTHENTICATED', 'No session')
    }

    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const userRole = profile?.role ?? user.user_metadata?.role ?? 'client'
    if (!['client', 'provider', 'admin'].includes(userRole)) {
      return jsonError(403, 'FORBIDDEN', 'Insufficient role')
    }

    const body = await request.json()
    const { days_back = 30 } = body

    // Validate parameters
    if (![7, 30, 90, 365].includes(days_back)) {
      return jsonError(400, 'INVALID_PARAMETER', 'days_back must be 7, 30, 90, or 365')
    }

    // Call the RPC function
    const { data, error } = await supabase.rpc('get_dashboard_kpis', {
      days_back
    })

    if (error) {
      console.error('Error calling get_dashboard_kpis:', error)
      return jsonError(500, 'INTERNAL_ERROR', 'Failed to fetch dashboard KPIs')
    }

    return NextResponse.json(data || [])

  } catch (error) {
    console.error('Dashboard KPIs API error:', error)
    return jsonError(500, 'INTERNAL_ERROR', 'Internal server error')
  }
}
