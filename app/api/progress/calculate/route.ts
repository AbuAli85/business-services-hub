import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { corsHeaders } from '@/lib/api-helpers'

// POST /api/progress/calculate - Calculate and update progress for a booking
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { booking_id, milestone_id, task_id } = body

    // Validate input
    if (!booking_id && !milestone_id && !task_id) {
      return NextResponse.json(
        { error: 'At least one ID (booking_id, milestone_id, or task_id) is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    const results: any = {}

    // Calculate booking progress if booking_id provided
    if (booking_id) {
      try {
        const { data, error } = await supabase.rpc('calculate_booking_progress', {
          booking_id: booking_id
        })
        
        if (error) {
          console.error('Error calculating booking progress:', error)
          results.booking_error = error.message
        } else {
          results.booking_progress = data
          
          // Get updated booking data
          const { data: bookingData } = await supabase
            .from('bookings')
            .select('progress_percentage, status, updated_at')
            .eq('id', booking_id)
            .single()
          
          results.booking_data = bookingData
        }
      } catch (error) {
        console.error('Error in booking progress calculation:', error)
        results.booking_error = 'Failed to calculate booking progress'
      }
    }

    // Calculate milestone progress if milestone_id provided
    if (milestone_id) {
      try {
        const { error } = await supabase.rpc('update_milestone_progress', {
          milestone_uuid: milestone_id
        })
        
        if (error) {
          console.error('Error updating milestone progress:', error)
          results.milestone_error = error.message
        } else {
          // Get updated milestone data
          const { data: milestoneData } = await supabase
            .from('milestones')
            .select('progress_percentage, status, completed_tasks, total_tasks, updated_at')
            .eq('id', milestone_id)
            .single()
          
          results.milestone_data = milestoneData
        }
      } catch (error) {
        console.error('Error in milestone progress calculation:', error)
        results.milestone_error = 'Failed to update milestone progress'
      }
    }

    // Update task if task_id provided
    if (task_id) {
      try {
        const { error } = await supabase.rpc('update_task', {
          task_id: task_id
        })
        
        if (error) {
          console.error('Error updating task:', error)
          results.task_error = error.message
        } else {
          // Get updated task data
          const { data: taskData } = await supabase
            .from('tasks')
            .select('progress_percentage, status, updated_at')
            .eq('id', task_id)
            .single()
          
          results.task_data = taskData
        }
      } catch (error) {
        console.error('Error in task update:', error)
        results.task_error = 'Failed to update task'
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    }, { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Progress calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// GET /api/progress/calculate - Get progress analytics for a booking
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const booking_id = searchParams.get('booking_id')

    if (!booking_id) {
      return NextResponse.json(
        { error: 'booking_id is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders }
      )
    }

    // Get progress analytics from materialized view
    const { data: analytics, error: analyticsError } = await supabase
      .from('mv_booking_progress_analytics')
      .select('*')
      .eq('booking_id', booking_id)
      .single()

    if (analyticsError) {
      console.error('Error fetching progress analytics:', analyticsError)
      
      // Fallback to manual calculation
      const { data: booking } = await supabase
        .from('bookings')
        .select('progress_percentage, status')
        .eq('id', booking_id)
        .single()

      const { data: milestones } = await supabase
        .from('milestones')
        .select(`
          id,
          progress_percentage,
          status,
          tasks(id, status, progress_percentage, estimated_hours, actual_hours, is_overdue)
        `)
        .eq('booking_id', booking_id)

      // Calculate analytics manually
      const totalMilestones = milestones?.length || 0
      const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0
      const totalTasks = milestones?.reduce((sum, m) => sum + (m.tasks?.length || 0), 0) || 0
      const completedTasks = milestones?.reduce((sum, m) => 
        sum + (m.tasks?.filter(t => t.status === 'completed').length || 0), 0) || 0

      return NextResponse.json({
        success: true,
        analytics: {
          booking_id,
          booking_progress: booking?.progress_percentage || 0,
          booking_status: booking?.status || 'pending',
          total_milestones: totalMilestones,
          completed_milestones: completedMilestones,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          milestone_progress: totalMilestones > 0 ? 
            Math.round((milestones || []).reduce((sum, m) => sum + (m.progress_percentage || 0), 0) / totalMilestones) : 0
        },
        timestamp: new Date().toISOString()
      }, { status: 200, headers: corsHeaders })
    }

    return NextResponse.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    }, { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('Progress analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}
