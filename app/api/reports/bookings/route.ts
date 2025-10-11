import { NextRequest, NextResponse } from 'next/server'
import { makeServerClient } from '@/utils/supabase/makeServerClient'
import { rateLimit, handleOptions, badRequest, unauthorized, ok } from '@/lib/api-helpers'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return handleOptions()
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit reports endpoint
    const limited = rateLimit(request, { key: 'reports-bookings', windowMs: 60_000, max: 60 })
    if (!limited.allowed) return limited.response!

    const supabase = await makeServerClient(request)
    const { searchParams } = new URL(request.url)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return unauthorized()
    }
    
    // Get user profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin'
    const isProvider = profile?.role === 'provider'
    const isClient = profile?.role === 'client'
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '25')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const bookingId = searchParams.get('booking_id')
    const type = searchParams.get('type') || 'list'
    
    // Build base query
    let query = supabase
      .from('bookings')
      .select(`
        id,
        title,
        status,
        project_progress,
        total_amount,
        created_at,
        updated_at,
        scheduled_date,
        due_at,
        client_id,
        provider_id,
        service_id,
        services(title, category),
        client_profile:profiles!bookings_client_id_fkey(full_name, company_name),
        provider_profile:profiles!bookings_provider_id_fkey(full_name, company_name)
      `)
    
    // Apply user-specific filters
    if (!isAdmin) {
      if (isProvider) {
        query = query.eq('provider_id', user.id)
      } else if (isClient) {
        query = query.eq('client_id', user.id)
      }
    }
    
    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }
    
    if (bookingId) {
      query = query.eq('id', bookingId)
    }
    
    // Handle detailed report request
    if (type === 'detailed' && bookingId) {
      // For detailed reports, we need to fetch comprehensive data
      const { data: bookingData, error: bookingError } = await query.single()
      
      if (bookingError || !bookingData) {
        return NextResponse.json({ 
          success: false, 
          error: 'Booking not found',
          details: bookingError?.message 
        }, { status: 404 })
      }
      
      // Handle relations as arrays (Supabase returns relations as arrays)
      const service = Array.isArray(bookingData.services) ? bookingData.services[0] : bookingData.services
      const clientProfile = Array.isArray(bookingData.client_profile) ? bookingData.client_profile[0] : bookingData.client_profile
      const providerProfile = Array.isArray(bookingData.provider_profile) ? bookingData.provider_profile[0] : bookingData.provider_profile
      
      // Create detailed report data structure
      const detailedReport = {
        booking: {
          id: bookingData.id,
          title: bookingData.title || 'Professional Service',
          status: bookingData.status || 'pending',
          raw_status: bookingData.status || 'pending',
          progress: bookingData.project_progress || 0,
          created_at: bookingData.created_at,
          updated_at: bookingData.updated_at,
          due_at: bookingData.due_at,
          scheduled_date: bookingData.scheduled_date,
          estimated_duration: null,
          location: null,
          requirements: null,
          notes: null
        },
        client: {
          id: bookingData.client_id || '',
          name: clientProfile?.full_name || 'Unknown Client',
          email: 'No email',
          company: clientProfile?.company_name || '',
          avatar: ''
        },
        provider: {
          id: bookingData.provider_id || '',
          name: providerProfile?.full_name || 'Unknown Provider',
          email: 'No email',
          company: providerProfile?.company_name || '',
          avatar: ''
        },
        service: {
          id: bookingData.service_id || '',
          title: service?.title || 'Professional Service',
          category: service?.category || 'General',
          description: 'No description available',
          base_price: bookingData.total_amount || 0,
          currency: 'OMR'
        },
        payment: {
          amount: bookingData.total_amount || 0,
          currency: 'OMR',
          status: 'pending'
        },
        invoice: {
          invoice_number: `INV-${bookingData.id.slice(0, 8)}`,
          amount: bookingData.total_amount || 0,
          status: 'pending'
        },
        analytics: {
          overall_progress: bookingData.project_progress || 0,
          duration_days: null,
          days_since_created: Math.floor((new Date().getTime() - new Date(bookingData.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          days_until_due: bookingData.due_at ? Math.floor((new Date(bookingData.due_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
        },
        milestones: {
          completed: 0,
          total: 0,
          completion_rate: 0,
          details: []
        },
        tasks: {
          completed: 0,
          total: 0,
          completion_rate: 0,
          details: []
        },
        communications: {
          total_messages: 0,
          details: []
        },
        files: {
          total_files: 0,
          details: []
        },
        timeline: []
      }
      
      return ok({
        success: true,
        report: detailedReport
      })
    }
    
    // Apply sorting
    const sortColumn = sort === 'createdAt' ? 'created_at' : 
                      sort === 'updatedAt' ? 'updated_at' :
                      sort === 'amount' ? 'amount' :
                      sort === 'title' ? 'title' :
                      sort === 'status' ? 'status' :
                      sort === 'progress' ? 'progress' : 'created_at'
    
    query = query.order(sortColumn, { ascending: order === 'asc' })
    
    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)
    
    const { data: bookings, error, count } = await query
    
    if (error) {
      console.error('Error fetching bookings report:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch bookings data',
        details: error.message 
      }, { status: 500 })
    }
    
    // Transform data for frontend
    const transformedBookings = bookings?.map(booking => {
      // Handle relations as arrays (Supabase returns relations as arrays)
      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
      const clientProfile = Array.isArray(booking.client_profile) ? booking.client_profile[0] : booking.client_profile
      const providerProfile = Array.isArray(booking.provider_profile) ? booking.provider_profile[0] : booking.provider_profile
      
      return {
        id: booking.id,
        title: booking.title,
        status: booking.status,
        operational_status: booking.status, // Use status as operational_status
        progress: booking.project_progress || 0,
        amount: booking.total_amount || 0,
        payment_status: 'pending', // Default since column doesn't exist
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        scheduled_date: booking.scheduled_date,
        completed_date: null, // Column doesn't exist
        client_id: booking.client_id,
        provider_id: booking.provider_id,
        service_id: booking.service_id,
        service_title: service?.title || 'Unknown Service',
        service_category: service?.category || 'Unknown',
        client_name: clientProfile?.full_name || 'Unknown Client',
        client_company: clientProfile?.company_name || '',
        provider_name: providerProfile?.full_name || 'Unknown Provider',
        provider_company: providerProfile?.company_name || ''
      }
    }) || []
    
    // Calculate summary statistics
    const totalBookings = transformedBookings.length
    const statusCounts = transformedBookings.reduce((acc: any, booking: any) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1
      return acc
    }, {})
    
    const totalRevenue = transformedBookings.reduce((sum: number, booking: any) => 
      sum + (booking.amount || 0), 0)
    
    const averageProgress = totalBookings > 0 
      ? transformedBookings.reduce((sum: number, booking: any) => sum + (booking.progress || 0), 0) / totalBookings 
      : 0
    
    // Calculate category breakdown
    const categoryBreakdown = transformedBookings.reduce((acc: any, booking: any) => {
      const category = booking.service_category || 'Unknown'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})
    
    // Calculate monthly breakdown
    const monthlyBreakdown = transformedBookings.reduce((acc: any, booking: any) => {
      const date = new Date(booking.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!acc[monthKey]) {
        acc[monthKey] = { count: 0, revenue: 0 }
      }
      acc[monthKey].count++
      acc[monthKey].revenue += booking.amount || 0
      return acc
    }, {})
    
    return ok({
      success: true,
      report: {
        summary: {
          total_bookings: totalBookings,
          total_revenue: totalRevenue,
          average_progress: averageProgress,
          period: {
            from: dateFrom || null,
            to: dateTo || null
          }
        },
        breakdown: {
          by_status: statusCounts,
          by_category: categoryBreakdown,
          by_month: monthlyBreakdown
        },
        bookings: transformedBookings.map((b: any) => ({
          id: b.id,
          title: b.title,
          status: b.status,
          client_name: b.client_name,
          provider_name: b.provider_name,
          service_title: b.service_title,
          progress: b.progress,
          amount: b.amount,
          currency: 'OMR', // Default currency
          created_at: b.created_at,
          due_at: b.scheduled_date
        }))
      },
      pagination: {
        page,
        pageSize,
        total: count || totalBookings,
        totalPages: Math.ceil((count || totalBookings) / pageSize)
      }
    })
    
  } catch (error) {
    console.error('Bookings reports API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}