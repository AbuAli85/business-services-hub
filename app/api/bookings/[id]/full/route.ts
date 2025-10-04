import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bookingId = params.id
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Get booking with all related data in a single query
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services (
          id,
          title,
          description,
          category,
          base_price,
          currency
        ),
        client_profile:profiles!bookings_client_id_fkey (
          id,
          full_name,
          email,
          company_name,
          phone
        ),
        provider_profile:profiles!bookings_provider_id_fkey (
          id,
          full_name,
          email,
          company_name,
          phone
        ),
        invoices (
          id,
          booking_id,
          status,
          amount,
          currency,
          created_at,
          due_date
        )
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError) {
      console.error('Error fetching booking:', bookingError)
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check permissions
    const userId = session.user.id
    const isClient = booking.client_id === userId
    const isProvider = booking.provider_id === userId
    const isAdmin = await checkIfAdmin(supabase, userId)

    if (!isClient && !isProvider && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get milestones and tasks
    const { data: milestones, error: milestonesError } = await supabase
      .from('milestones')
      .select(`
        *,
        tasks (
          id,
          milestone_id,
          title,
          description,
          status,
          assigned_to,
          due_date,
          completed_at
        )
      `)
      .eq('booking_id', bookingId)
      .order('order_index', { ascending: true })

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError)
    }

    // Get recent messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        sender_id,
        booking_id,
        sender:sender_id (
          full_name,
          email
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
    }

    // Get uploaded files
    const { data: files, error: filesError } = await supabase
      .from('booking_files')
      .select(`
        id,
        name,
        url,
        size,
        uploaded_by,
        created_at
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (filesError) {
      console.error('Error fetching files:', filesError)
    }

    // Calculate progress statistics
    const totalMilestones = milestones?.length || 0
    const completedMilestones = milestones?.filter(m => m.status === 'completed').length || 0
    const totalTasks = milestones?.reduce((sum, m) => sum + (m.tasks?.length || 0), 0) || 0
    const completedTasks = milestones?.reduce((sum, m) => 
      sum + (m.tasks?.filter((t: any) => t.status === 'completed').length || 0), 0) || 0

    const response = {
      booking: {
        ...booking,
        service: Array.isArray(booking.services) ? booking.services[0] : booking.services,
        client: booking.client_profile,
        provider: booking.provider_profile,
        invoice: booking.invoices?.[0] || null
      },
      milestones: milestones || [],
      messages: messages || [],
      files: files || [],
      statistics: {
        totalMilestones,
        completedMilestones,
        totalTasks,
        completedTasks,
        progressPercentage: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0
      },
      permissions: {
        isClient,
        isProvider,
        isAdmin,
        canEdit: isProvider || isAdmin,
        canApprove: isProvider || isAdmin,
        canViewMilestones: ['approved', 'confirmed', 'in_progress', 'completed'].includes(booking.status)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in booking full API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkIfAdmin(supabase: any, userId: string): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    return profile?.role === 'admin'
  } catch {
    return false
  }
}
