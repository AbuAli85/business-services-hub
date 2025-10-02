import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get dashboard data using the optimized RPC function
    const { data: dashboardData, error: rpcError } = await supabase
      .rpc('get_booking_dashboard_data', {
        user_id: user.id,
        user_role: profile.role
      })

    if (rpcError) {
      console.error('RPC Error:', rpcError)
      return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
    }

    // Transform the data for the frontend
    const transformedData = {
      stats: {
        total: dashboardData.stats.total_bookings || 0,
        active: dashboardData.stats.active_bookings || 0,
        pending: dashboardData.stats.pending_bookings || 0,
        completed: dashboardData.stats.completed_bookings || 0,
        cancelled: dashboardData.stats.cancelled_bookings || 0,
        disputed: dashboardData.stats.disputed_bookings || 0,
        
        revenue: {
          total: dashboardData.stats.total_revenue || 0,
          completed: dashboardData.stats.completed_revenue || 0,
          pending: dashboardData.stats.pending_revenue || 0
        },
        
        progress: {
          average: Math.round(dashboardData.stats.avg_progress_percentage || 0),
          milestone_average: Math.round(dashboardData.stats.avg_milestone_progress || 0)
        },
        
        rates: {
          success: dashboardData.stats.success_rate || 0,
          portfolio: dashboardData.stats.portfolio_percentage || 0
        },
        
        milestones: {
          bookings_with_milestones: dashboardData.stats.bookings_with_milestones || 0
        }
      },
      
      bookings: dashboardData.bookings || [],
      
      last_updated: dashboardData.last_updated
    }

    return NextResponse.json({
      success: true,
      data: transformedData
    })

  } catch (error) {
    console.error('Dashboard API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: Add POST endpoint for updating booking progress
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { booking_id, action } = body

    if (!booking_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Handle different actions
    switch (action) {
      case 'update_progress':
        const { data: progressData, error: progressError } = await supabase
          .rpc('update_booking_progress_from_milestones', {
            booking_uuid: booking_id
          })

        if (progressError) {
          return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          progress: progressData
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Dashboard POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
