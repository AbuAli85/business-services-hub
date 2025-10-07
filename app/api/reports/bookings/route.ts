import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseClient()
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('booking_id')
    const reportType = searchParams.get('type') || 'detailed'
    const format = searchParams.get('format') || 'json'
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const status = searchParams.get('status')

    // Get user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, company_id')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let reportData: any = {}

    if (bookingId) {
      // Generate detailed report for specific booking
      reportData = await generateDetailedBookingReport(supabase, bookingId, profile)
    } else {
      // Generate summary report for multiple bookings
      reportData = await generateSummaryReport(supabase, profile, {
        dateFrom,
        dateTo,
        status
      })
    }

    if (format === 'pdf') {
      // TODO: Implement PDF generation
      return NextResponse.json({ 
        message: 'PDF generation not implemented yet',
        data: reportData 
      })
    }

    return NextResponse.json({
      success: true,
      report: reportData,
      generated_at: new Date().toISOString(),
      generated_by: session.user.id
    })

  } catch (error) {
    console.error('Error generating booking report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

async function generateDetailedBookingReport(supabase: any, bookingId: string, profile: any) {
  // Get comprehensive booking data
  const { data: booking, error: bookingError } = await supabase
    .from('v_booking_status')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    throw new Error('Booking not found')
  }

  // Check permissions
  if (profile.role !== 'admin' && 
      booking.client_id !== profile.id && 
      booking.provider_id !== profile.id) {
    throw new Error('Unauthorized to view this booking')
  }

  // Get milestones
  const { data: milestones, error: milestonesError } = await supabase
    .from('milestones')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  // Get tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  // Get communications/messages
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${booking.client_id},receiver_id.eq.${booking.client_id}`)
    .or(`sender_id.eq.${booking.provider_id},receiver_id.eq.${booking.provider_id}`)
    .order('created_at', { ascending: true })

  // Get files
  const { data: files, error: filesError } = await supabase
    .from('booking_files')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })

  // Get invoice information
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .single()

  // Calculate progress metrics
  const totalMilestones = milestones?.length || 0
  const completedMilestones = milestones?.filter((m: any) => m.status === 'completed').length || 0
  const totalTasks = tasks?.length || 0
  const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0

  return {
    booking: {
      id: booking.id,
      title: booking.booking_title,
      status: booking.display_status,
      raw_status: booking.raw_status,
      progress: booking.progress,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      due_at: booking.due_at,
      scheduled_date: booking.scheduled_date,
      estimated_duration: booking.estimated_duration,
      location: booking.location,
      requirements: booking.requirements,
      notes: booking.notes
    },
    client: {
      id: booking.client_id,
      name: booking.client_name,
      email: booking.client_email,
      company: booking.client_company,
      avatar: booking.client_avatar
    },
    provider: {
      id: booking.provider_id,
      name: booking.provider_name,
      email: booking.provider_email,
      company: booking.provider_company,
      avatar: booking.provider_avatar
    },
    service: {
      id: booking.service_id,
      title: booking.service_title,
      description: booking.service_description,
      category: booking.service_category
    },
    payment: {
      amount: booking.amount,
      amount_cents: booking.amount_cents,
      currency: booking.currency,
      status: booking.payment_status,
      invoice_status: booking.invoice_status
    },
    milestones: {
      total: totalMilestones,
      completed: completedMilestones,
      completion_rate: totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0,
      details: milestones || []
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      details: tasks || []
    },
    communications: {
      total_messages: messages?.length || 0,
      details: messages || []
    },
    files: {
      total_files: files?.length || 0,
      details: files || []
    },
    invoice: invoice || null,
    analytics: {
      duration_days: booking.due_at ? 
        Math.ceil((new Date(booking.due_at).getTime() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60 * 24)) : null,
      days_since_created: Math.ceil((new Date().getTime() - new Date(booking.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      days_until_due: booking.due_at ? 
        Math.ceil((new Date(booking.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
      overall_progress: booking.progress || 0
    }
  }
}

async function generateSummaryReport(supabase: any, profile: any, filters: any) {
  let query = supabase
    .from('v_booking_status')
    .select('*', { count: 'exact' })

  // Apply role-based filtering
  if (profile.role === 'client') {
    query = query.eq('client_id', profile.id)
  } else if (profile.role === 'provider') {
    query = query.eq('provider_id', profile.id)
  }
  // Admin can see all bookings

  // Apply filters
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('display_status', filters.status)
  }

  const { data: bookings, error: bookingsError, count } = await query

  if (bookingsError) {
    throw new Error('Failed to fetch bookings')
  }

  // Calculate summary statistics
  const totalBookings = count || 0
  const totalRevenue = bookings?.reduce((sum: number, booking: any) => sum + (booking.amount || 0), 0) || 0
  const avgProgress = bookings?.length > 0 ? 
    bookings.reduce((sum: number, booking: any) => sum + (booking.progress || 0), 0) / bookings.length : 0

  // Status breakdown
  const statusBreakdown = bookings?.reduce((acc: any, booking: any) => {
    const status = booking.display_status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {}) || {}

  // Category breakdown
  const categoryBreakdown = bookings?.reduce((acc: any, booking: any) => {
    const category = booking.service_category || 'uncategorized'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {}) || {}

  // Monthly breakdown
  const monthlyBreakdown = bookings?.reduce((acc: any, booking: any) => {
    const month = new Date(booking.created_at).toISOString().substring(0, 7) // YYYY-MM
    if (!acc[month]) {
      acc[month] = { count: 0, revenue: 0 }
    }
    acc[month].count += 1
    acc[month].revenue += booking.amount || 0
    return acc
  }, {}) || {}

  return {
    summary: {
      total_bookings: totalBookings,
      total_revenue: totalRevenue,
      average_progress: Math.round(avgProgress * 100) / 100,
      period: {
        from: filters.dateFrom || null,
        to: filters.dateTo || null
      }
    },
    breakdown: {
      by_status: statusBreakdown,
      by_category: categoryBreakdown,
      by_month: monthlyBreakdown
    },
    bookings: bookings || []
  }
}
