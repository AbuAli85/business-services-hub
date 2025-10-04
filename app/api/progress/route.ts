import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/progress?booking_id=xxx - Get progress data for a booking
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Create Supabase client with proper server-side authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.warn('Authentication failed in progress API:', authError)
      // Return empty data structure instead of failing completely
      return NextResponse.json({
        success: true,
        data: {
          milestones: [],
          timeEntries: [],
          comments: [],
          bookingProgress: null,
          overallProgress: 0,
          totalTasks: 0,
          completedTasks: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          overdueTasks: 0
        }
      })
    }

    // Verify user has access to this booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, client_id, provider_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.warn('Booking not found in progress API:', bookingError)
      // Return empty data structure instead of failing completely
      return NextResponse.json({
        success: true,
        data: {
          milestones: [],
          timeEntries: [],
          comments: [],
          bookingProgress: null,
          overallProgress: 0,
          totalTasks: 0,
          completedTasks: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          overdueTasks: 0
        }
      })
    }

    // Check if user is client or provider for this booking
    const isClient = booking.client_id === user.id
    const isProvider = booking.provider_id === user.id

    if (!isClient && !isProvider) {
      console.warn('Access denied in progress API - user is not client or provider for this booking')
      // Return empty data structure instead of failing completely
      return NextResponse.json({
        success: true,
        data: {
          milestones: [],
          timeEntries: [],
          comments: [],
          bookingProgress: null,
          overallProgress: 0,
          totalTasks: 0,
          completedTasks: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          overdueTasks: 0
        }
      })
    }

    // Get milestones with tasks
    let milestones = []
    try {
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select(`
          *,
          tasks (*)
        `)
        .eq('booking_id', bookingId)
        .order('order_index', { ascending: true })

      if (milestonesError) {
        console.warn('Error fetching milestones:', milestonesError)
        // Don't fail the request, just return empty array
      } else {
        milestones = milestonesData || []
      }
    } catch (error) {
      console.warn('Exception fetching milestones:', error)
      // Return empty array for milestones
    }

    // Get time entries with proper error handling
    let timeEntries = []
    try {
      const { data: timeEntriesData, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('booking_id', bookingId)
        .order('logged_at', { ascending: false })

      if (timeEntriesError) {
        console.warn('Error fetching time entries:', timeEntriesError)
        // Don't fail the request, just return empty array
      } else {
        timeEntries = timeEntriesData || []
      }
    } catch (error) {
      console.warn('Exception fetching time entries:', error)
      // Return empty array for time entries
    }

    // Get comments
    let comments = []
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

      if (commentsError) {
        console.warn('Error fetching comments:', commentsError)
        // Don't fail the request, just return empty array
      } else {
        comments = commentsData || []
      }
    } catch (error) {
      console.warn('Exception fetching comments:', error)
      // Return empty array for comments
    }

    // Get booking progress
    let bookingProgress = null
    try {
      const { data: bookingProgressData, error: bookingProgressError } = await supabase
        .from('booking_progress')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (bookingProgressError && bookingProgressError.code !== 'PGRST116') {
        console.warn('Error fetching booking progress:', bookingProgressError)
        // Don't fail the request, just return null
      } else {
        bookingProgress = bookingProgressData || null
      }
    } catch (error) {
      console.warn('Exception fetching booking progress:', error)
      // Return null for booking progress
    }

    // Calculate statistics
    const normalizedMilestones = (milestones || []).map((m: any) => ({
      ...m,
      tasks: (m.tasks || []).sort((a: any, b: any) => {
        const ao = a.order_index ?? 0
        const bo = b.order_index ?? 0
        if (ao !== bo) return ao - bo
        const ad = a.created_at ? new Date(a.created_at).getTime() : 0
        const bd = b.created_at ? new Date(b.created_at).getTime() : 0
        return ad - bd
      })
    }))

    const totalTasks = normalizedMilestones?.reduce((sum: number, m: any) => sum + (m.tasks?.length || 0), 0) || 0
    const completedTasks = normalizedMilestones?.reduce((sum: number, m: any) => 
      sum + (m.tasks?.filter((t: any) => t.status === 'completed').length || 0), 0) || 0
    const totalEstimatedHours = normalizedMilestones?.reduce((sum: number, m: any) => 
      sum + (m.estimated_hours || 0) + (m.tasks?.reduce((taskSum: number, t: any) => taskSum + (t.estimated_hours || 0), 0) || 0), 0) || 0
    const totalActualHours = timeEntries?.reduce((sum, te) => sum + (te.duration_hours || 0), 0) || 0
    const overdueTasks = normalizedMilestones?.reduce((sum: number, m: any) => 
      sum + (m.tasks?.filter((t: any) => t.is_overdue).length || 0), 0) || 0

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Transform due_date to end_date for frontend compatibility
    const transformedMilestones = normalizedMilestones?.map((milestone: any) => ({
      ...milestone,
      end_date: milestone.due_date,
      tasks: milestone.tasks?.map((task: any) => ({
        ...task,
        end_date: task.due_date
      })) || []
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        milestones: transformedMilestones,
        timeEntries: timeEntries || [],
        comments: comments || [],
        bookingProgress: bookingProgress || null,
        overallProgress,
        totalTasks,
        completedTasks,
        totalEstimatedHours,
        totalActualHours,
        overdueTasks
      }
    })

  } catch (error) {
    console.error('Error in progress API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
